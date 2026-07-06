/**
 * # Crawler chính cho Weibo (微博) — điều phối search, detail, creator, comments
 */

import { WeiboClient } from "./client.js";
import { WeiboExtractor } from "./extractor.js";
import { uploadMediaToR2, checkMediaExistsInR2 } from "../../store/r2_uploader.js";
import {
  upsertAuthor,
  upsertPost,
  upsertComments,
  getPostUuid,
  checkoutAccount,
  checkinAccount,
} from "../../store/index.js";
import { CrawledPostRow } from "../../model/storage.js";
import type { ICrawler, BrowserLaunchOptions } from "../../base/base_crawler.js";
import type { BrowserContext, Page } from "playwright-core";
import { CONFIG } from "../../config.js";
import { parseCookieString } from "../../utils/crawler.js";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { WeiboSearchType } from "./field.js";

async function downloadWeiboImage(url: string): Promise<Buffer> {
  let targetUrl = url;
  if (url.startsWith("https://") || url.startsWith("http://")) {
    const cleanUrl = url.replace(/^https?:\/\//, "");
    const parts = cleanUrl.split("/");
    let formatted = "";
    for (let i = 0; i < parts.length; i++) {
      if (i === 1) {
        formatted += "large/";
      } else if (i === parts.length - 1) {
        formatted += parts[i];
      } else {
        formatted += parts[i] + "/";
      }
    }
    targetUrl = `https://i1.wp.com/${formatted}`;
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!resp.ok) {
      throw new Error(`Hãng ảnh proxy lỗi: status ${resp.status}`);
    }
    return Buffer.from(await resp.arrayBuffer());
  } catch (err) {
    // Trực tiếp tải từ url gốc nếu proxy thất bại
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!resp.ok) {
      throw new Error(`Tải trực tiếp ảnh gốc lỗi: status ${resp.status}`);
    }
    return Buffer.from(await resp.arrayBuffer());
  }
}

async function persistAuthor(rawUser: any): Promise<string> {
  const authorRow = WeiboExtractor.extractAuthor(rawUser);

  let avatarUrlR2 = "";
  if (authorRow.avatar_url) {
    try {
      const exists = await checkMediaExistsInR2("weibo", authorRow.platform_uid, "avatar.jpg");
      if (exists) {
        avatarUrlR2 = `weibo/${authorRow.platform_uid}/avatar.jpg`;
      } else {
        const avatarBuf = await downloadWeiboImage(authorRow.avatar_url);
        avatarUrlR2 = await uploadMediaToR2("weibo", authorRow.platform_uid, "avatar.jpg", avatarBuf, "image/jpeg");
      }
    } catch (e) {
      console.log(`[WeiboCrawler] Không thể tải avatar của tác giả lên R2:`, e);
      avatarUrlR2 = authorRow.avatar_url; // fallback
    }
  }

  authorRow.avatar_url = avatarUrlR2 || undefined;
  return await upsertAuthor(authorRow);
}

async function persistPost(noteItem: any, authorUuid?: string): Promise<string> {
  const postRow = WeiboExtractor.extractPost(noteItem, authorUuid);

  // Tải các hình ảnh/video đính kèm lên R2
  const r2Urls: string[] = [];
  if (postRow.media_urls && postRow.media_urls.length > 0) {
    for (let i = 0; i < postRow.media_urls.length; i++) {
      const originalUrl = postRow.media_urls[i];
      try {
        const ext = originalUrl.split(".").pop()?.split("?")[0] || "jpg";
        const filename = `media_${i}.${ext}`;
        const exists = await checkMediaExistsInR2("weibo", postRow.platform_id, filename);
        if (exists) {
          r2Urls.push(`weibo/${postRow.platform_id}/${filename}`);
        } else {
          const buf = await downloadWeiboImage(originalUrl);
          const mimeType = ext === "mp4" ? "video/mp4" : "image/jpeg";
          const r2Url = await uploadMediaToR2("weibo", postRow.platform_id, filename, buf, mimeType);
          r2Urls.push(r2Url);
        }
      } catch (e) {
        console.log(`[WeiboCrawler] Không thể tải file đính kèm lên R2 cho bài viết ${postRow.platform_id}:`, e);
        r2Urls.push(originalUrl);
      }
    }
  }

  postRow.media_urls = r2Urls;
  if (postRow.cover_url && r2Urls.length > 0) {
    postRow.cover_url = r2Urls[0];
  }

  await upsertPost(postRow);
  const uuid = await getPostUuid("weibo", postRow.platform_id);
  if (!uuid) {
    throw new Error(`Không thể lấy UUID của bài đăng vừa chèn: ${postRow.platform_id}`);
  }
  return uuid;
}

export class WeiboCrawler implements ICrawler {
  private client: WeiboClient;
  private currentAccountId: string | null = null;
  private browserContext: BrowserContext | null = null;
  private browserPage: Page | null = null;

  constructor() {
    this.client = new WeiboClient();
  }

  async launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext> {
    if (this.browserContext) {
      return this.browserContext;
    }
    const { launchPersistentContext } = await import("cloakbrowser");
    const profileDir = join(process.cwd(), "output", "profiles", "weibo");

    const launchOptions: any = {
      userDataDir: profileDir,
      headless: options?.headless ?? CONFIG.headless,
      geoip: true,
      humanize: true,
    };
    if (CONFIG.proxy) {
      launchOptions.proxy = CONFIG.proxy;
    }

    const rawContext = await launchPersistentContext(launchOptions);
    this.browserContext = rawContext as unknown as BrowserContext;

    const pages = this.browserContext.pages();
    this.browserPage = pages[0] || (await this.browserContext.newPage());
    
    // Chặn tài nguyên không cần thiết để tăng tốc
    await this.browserPage.route("**/*", (route: any) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    this.client.setPage(this.browserPage);
    return this.browserContext;
  }

  async ensureLogin(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 5;

    // 1. Thử lấy tài khoản từ Account Pool trong Database
    while (attempts < maxAttempts) {
      const account = await checkoutAccount("weibo");
      if (!account) {
        break;
      }
      console.log(`Đang kiểm tra tài khoản Weibo từ pool: ${account.username} (ID: ${account.id})...`);

      const context = await this.launchBrowser();
      const cookieDict = parseCookieString(account.cookie_data);
      const cookieObjects = [".weibo.cn", ".weibo.com", "m.weibo.cn"].flatMap(domain =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );
      await context.addCookies(cookieObjects);

      const isActive = await this.client.pong(context);
      if (isActive) {
        console.log(`Tài khoản Weibo ${account.username} hoạt động tốt. Sẵn sàng cào.`);
        this.currentAccountId = account.id;
        // Đồng bộ cookie hoạt động hiện tại sang Client
        const freshCookies = await context.cookies();
        await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
        return;
      } else {
        console.log(`Tài khoản Weibo ${account.username} không hoạt động. Trả lại pool với đánh dấu lỗi...`);
        await checkinAccount(account.id, false);
        this.currentAccountId = null;
        attempts++;
      }
    }

    // 2. Dự phòng: Sử dụng cookie cục bộ từ môi trường hoặc JSON session file
    console.log("Không có tài khoản hoạt động nào từ Pool DB. Đang thử bằng cookie cục bộ...");
    const context = await this.launchBrowser();

    let localCookie = process.env.WEIBO_COOKIE || "";
    if (!localCookie) {
      try {
        const sessionPath = join(process.cwd(), "output", "weibo_session.json");
        const content = await readFile(sessionPath, "utf8");
        localCookie = JSON.parse(content).cookie || "";
      } catch {}
    }

    if (localCookie) {
      const cookieDict = parseCookieString(localCookie);
      const cookieObjects = [".weibo.cn", ".weibo.com", "m.weibo.cn"].flatMap(domain =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );
      await context.addCookies(cookieObjects);
    }

    const localIsActive = await this.client.pong(context);
    if (localIsActive) {
      console.log("Cookie cục bộ Weibo hoạt động tốt.");
      this.currentAccountId = null;
      const freshCookies = await context.cookies();
      await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
      return;
    }

    // 3. Tiến hành đăng nhập thủ công bằng cookie mới nạp qua WeiboLogin
    console.log("Cookie cục bộ hết hạn hoặc chưa đăng nhập. Tiến hành cấu hình qua WeiboLogin...");
    const { WeiboLogin } = await import("./login.js");
    try {
      const login = new WeiboLogin({
        cookieStr: localCookie,
      });
      const result = await login.begin(context);
      if (!result.success) {
        console.log(`Đăng nhập không thành công: ${result.errorMessage}. Chạy chế độ khách (Guest)...`);
      } else {
        const cookieStr = result.cookies.map(c => `${c.name}=${c.value}`).join("; ");
        const sessionPath = join(process.cwd(), "output", "weibo_session.json");
        await mkdir(join(process.cwd(), "output"), { recursive: true });
        await writeFile(sessionPath, JSON.stringify({ cookie: cookieStr, updatedAt: new Date().toISOString() }, null, 2), "utf8");
        console.log("Đăng nhập thành công. Đã cập nhật và lưu cookie mới.");
        await this.client.updateCookies(result.cookies);
      }
    } catch (err) {
      console.log(`Không thể hoàn thành đăng nhập: ${(err as Error).message}. Tiếp tục bằng chế độ khách (Guest)...`);
    }
  }

  async releaseAccount(isSuccessful: boolean = true): Promise<void> {
    if (this.currentAccountId) {
      await checkinAccount(this.currentAccountId, isSuccessful);
      this.currentAccountId = null;
    }
    if (this.browserContext) {
      await this.browserContext.close();
      this.browserContext = null;
      this.browserPage = null;
    }
  }

  /**
   * # Thực hiện cào chi tiết bài đăng Weibo
   */
  async crawl(target: string): Promise<void> {
    let success = false;
    try {
      let noteId = target;
      if (target.includes("/detail/")) {
        const match = target.match(/\/detail\/(\d+)/);
        if (match) noteId = match[1];
      }

      await this.ensureLogin();
      const noteItem = await this.client.getNoteInfoById(noteId);
      if (!noteItem || !noteItem.mblog) {
        throw new Error(`Không tìm thấy thông tin chi tiết cho bài đăng: ${noteId}`);
      }

      let authorUuid: string | undefined;
      const mblog = noteItem.mblog;
      if (mblog.user) {
        authorUuid = await persistAuthor(mblog.user);
      }

      const postUuid = await persistPost(noteItem, authorUuid);

      // Cào bình luận nếu được cấu hình
      if (process.env.CRAWLER_ENABLE_COMMENTS !== "false") {
        await this.client.getNoteAllComments(
          noteId,
          2.0,
          async (_, comments) => {
            const commentRows = comments.map(c => WeiboExtractor.extractComment(c, noteId, postUuid));
            await upsertComments(commentRows);
          },
          50
        );
      }
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Thực hiện cào profile creator và bài đăng của họ trên Weibo
   */
  async creator(target: string): Promise<void> {
    let success = false;
    try {
      const creatorId = target;
      await this.ensureLogin();

      // Cào thông tin tác giả
      const creatorInfoRes = await this.client.getCreatorInfoById(creatorId);
      const userInfo = creatorInfoRes?.userInfo;
      if (!userInfo) {
        throw new Error(`Không lấy được thông tin creator: ${creatorId}`);
      }

      const authorUuid = await persistAuthor(userInfo);
      const containerInfo = await this.client.getCreatorContainerInfo(creatorId);

      // Cào danh sách bài viết
      const allNotes = await this.client.getAllNotesByCreatorId(
        creatorId,
        containerInfo.lfid_container_id,
        2.0,
        async (notes) => {
          for (const noteItem of notes) {
            const postUuid = await persistPost(noteItem, authorUuid);
            
            // Cào bình luận cho từng bài viết của creator
            if (process.env.CRAWLER_ENABLE_COMMENTS !== "false" && noteItem.mblog?.id) {
              const noteId = String(noteItem.mblog.id);
              await this.client.getNoteAllComments(
                noteId,
                2.0,
                async (_, comments) => {
                  const commentRows = comments.map(c => WeiboExtractor.extractComment(c, noteId, postUuid));
                  await upsertComments(commentRows);
                },
                20 // giới hạn bình luận của creator để tránh rate limit
              );
            }
          }
        }
      );

      console.log(`Đã hoàn thành cào ${allNotes.length} bài viết của Creator: ${creatorId}`);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Tìm kiếm bài đăng Weibo theo từ khóa
   */
  async search(keyword: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      const limit = maxCount || 20;
      await this.ensureLogin();

      let page = 1;
      let crawledCount = 0;
      let hasMore = true;

      while (hasMore && crawledCount < limit) {
        console.log(`Đang tìm kiếm từ khóa "${keyword}", trang ${page}...`);
        const searchRes = await this.client.getNoteByKeyword(keyword, page, WeiboSearchType.DEFAULT);
        if (!searchRes || !searchRes.cards) {
          break;
        }

        const cards: any[] = searchRes.cards;
        // Trích xuất các bài viết
        const noteItems: any[] = [];
        for (const card of cards) {
          if (card.card_type === 9) {
            noteItems.push(card);
          }
          if (card.card_group && Array.isArray(card.card_group)) {
            for (const item of card.card_group) {
              if (item.card_type === 9) {
                noteItems.push(item);
              }
            }
          }
        }

        if (noteItems.length === 0) {
          break;
        }

        for (const noteItem of noteItems) {
          if (crawledCount >= limit) {
            break;
          }

          const mblog = noteItem.mblog;
          if (!mblog) continue;

          let authorUuid: string | undefined;
          if (mblog.user) {
            authorUuid = await persistAuthor(mblog.user);
          }

          const postUuid = await persistPost(noteItem, authorUuid);

          // Cào bình luận của bài viết tìm kiếm được
          if (process.env.CRAWLER_ENABLE_COMMENTS !== "false" && mblog.id) {
            const noteId = String(mblog.id);
            await this.client.getNoteAllComments(
              noteId,
              2.0,
              async (_, comments) => {
                const commentRows = comments.map(c => WeiboExtractor.extractComment(c, noteId, postUuid));
                await upsertComments(commentRows);
              },
              10
            );
          }

          crawledCount++;
        }

        page++;
        hasMore = searchRes.cardlistInfo?.total > page * 10;
        await new Promise(r => setTimeout(r, 2000));
      }

      console.log(`Đã hoàn thành tìm kiếm. Tổng số bài viết thu được: ${crawledCount}`);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Cào bình luận của bài đăng Weibo
   */
  async comments(target: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      const noteId = target;
      const limit = maxCount || 50;
      await this.ensureLogin();

      const postUuid = await getPostUuid("weibo", noteId);

      await this.client.getNoteAllComments(
        noteId,
        2.0,
        async (_, comments) => {
          const commentRows = comments.map(c => WeiboExtractor.extractComment(c, noteId, postUuid));
          await upsertComments(commentRows);
        },
        limit
      );

      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }
}
