/**
 * # Crawler chính cho XHS (小红书) — điều phối search, detail, creator, comments
 */

import { XhsClient } from "./client.js";
import { XhsExtractor } from "./extractor.js";
import { uploadMediaToR2, checkMediaExistsInR2 } from "../../store/r2_uploader.js";
import {
  upsertAuthor,
  upsertPost,
  upsertComments,
  getPostUuid,
  checkoutAccount,
  checkinAccount,
} from "../../store/index.js";
import type { ICrawler, BrowserLaunchOptions } from "../../base/base_crawler.js";
import type { BrowserContext, Page } from "playwright-core";
import { CONFIG } from "../../config.js";
import { parseCookieString } from "../../utils/crawler.js";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

interface NoteUrlInfo {
  noteId: string;
  xsecSource: string;
  xsecToken: string;
}

interface CreatorUrlInfo {
  userId: string;
  xsecSource: string;
  xsecToken: string;
}

function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (e) {
    const queryPart = url.split("?")[1];
    if (queryPart) {
      const pairs = queryPart.split("&");
      for (const pair of pairs) {
        const [k, v] = pair.split("=");
        if (k) {
          params[decodeURIComponent(k)] = decodeURIComponent(v || "");
        }
      }
    }
  }
  return params;
}

function parseNoteInfoFromUrl(url: string): NoteUrlInfo {
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith("http")) {
    const pathPart = cleanUrl.split("?")[0];
    const noteId = pathPart.split("/").pop() || "";
    const params = parseUrlParams(cleanUrl);
    return {
      noteId,
      xsecSource: params.xsec_source || "pc_search",
      xsecToken: params.xsec_token || "",
    };
  } else {
    return {
      noteId: cleanUrl,
      xsecSource: "pc_search",
      xsecToken: "",
    };
  }
}

function parseCreatorInfoFromUrl(url: string): CreatorUrlInfo {
  const cleanUrl = url.trim();
  if (cleanUrl.length === 24 && /^[0-9a-fA-F]+$/.test(cleanUrl)) {
    return {
      userId: cleanUrl,
      xsecSource: "pc_feed",
      xsecToken: "",
    };
  }

  const match = cleanUrl.match(/\/user\/profile\/([^/?]+)/);
  if (match) {
    const userId = match[1];
    const params = parseUrlParams(cleanUrl);
    return {
      userId,
      xsecSource: params.xsec_source || "pc_feed",
      xsecToken: params.xsec_token || "",
    };
  }

  throw new Error(`Unable to parse creator info from URL: ${url}`);
}

function base36encode(number: bigint, alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"): string {
  let num = number;
  let base36 = "";
  let sign = "";

  if (num < 0n) {
    sign = "-";
    num = -num;
  }

  const base = BigInt(alphabet.length);
  if (num === 0n) {
    return alphabet[0];
  }

  while (num > 0n) {
    const i = Number(num % base);
    num = num / base;
    base36 = alphabet[i] + base36;
  }

  return sign + base36;
}

function getSearchId(): string {
  const timestamp = BigInt(Date.now()) << 64n;
  const rand = BigInt(Math.floor(Math.random() * 2147483646));
  return base36encode(timestamp + rand);
}

async function downloadXhsMedia(url: string): Promise<Buffer> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!resp.ok) {
    throw new Error(`Không thể tải tài nguyên XHS: status ${resp.status}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function persistAuthor(rawCreator: any): Promise<string> {
  const authorRow = XhsExtractor.extractAuthor(rawCreator);

  let avatarUrlR2 = "";
  if (authorRow.avatar_url) {
    try {
      const exists = await checkMediaExistsInR2("xhs", authorRow.platform_uid, "avatar.jpg");
      if (exists) {
        avatarUrlR2 = `xhs/${authorRow.platform_uid}/avatar.jpg`;
      } else {
        const avatarBuf = await downloadXhsMedia(authorRow.avatar_url);
        avatarUrlR2 = await uploadMediaToR2("xhs", authorRow.platform_uid, "avatar.jpg", avatarBuf, "image/jpeg");
      }
    } catch (e) {
      console.log(`[XhsCrawler] Không thể tải avatar của tác giả lên R2:`, e);
      avatarUrlR2 = authorRow.avatar_url;
    }
  }

  authorRow.avatar_url = avatarUrlR2 || undefined;
  return await upsertAuthor(authorRow);
}

async function persistPost(rawNote: any, authorUuid?: string): Promise<string> {
  const postRow = XhsExtractor.extractPost(rawNote, authorUuid);

  // Tải các hình ảnh/video đính kèm lên R2
  const r2Urls: string[] = [];
  if (postRow.media_urls && postRow.media_urls.length > 0) {
    for (let i = 0; i < postRow.media_urls.length; i++) {
      const originalUrl = postRow.media_urls[i];
      try {
        const ext = originalUrl.split(".").pop()?.split("?")[0] || "jpg";
        const filename = `media_${i}.${ext}`;
        const exists = await checkMediaExistsInR2("xhs", postRow.platform_id, filename);
        if (exists) {
          r2Urls.push(`xhs/${postRow.platform_id}/${filename}`);
        } else {
          const buf = await downloadXhsMedia(originalUrl);
          const mimeType = ext === "mp4" ? "video/mp4" : "image/jpeg";
          const r2Url = await uploadMediaToR2("xhs", postRow.platform_id, filename, buf, mimeType);
          r2Urls.push(r2Url);
        }
      } catch (e) {
        console.log(`[XhsCrawler] Không thể tải file đính kèm lên R2 cho bài viết ${postRow.platform_id}:`, e);
        r2Urls.push(originalUrl);
      }
    }
  }

  postRow.media_urls = r2Urls;
  if (postRow.cover_url) {
    try {
      const filename = "cover.jpg";
      const exists = await checkMediaExistsInR2("xhs", postRow.platform_id, filename);
      let coverUrlR2 = "";
      if (exists) {
        coverUrlR2 = `xhs/${postRow.platform_id}/${filename}`;
      } else {
        const buf = await downloadXhsMedia(postRow.cover_url);
        coverUrlR2 = await uploadMediaToR2("xhs", postRow.platform_id, filename, buf, "image/jpeg");
      }
      postRow.cover_url = coverUrlR2;
    } catch (e) {
      console.log(`[XhsCrawler] Không thể tải cover lên R2 cho bài viết ${postRow.platform_id}:`, e);
    }
  }

  await upsertPost(postRow);
  const uuid = await getPostUuid("xhs", postRow.platform_id);
  if (!uuid) {
    throw new Error(`Không thể lấy UUID của bài đăng vừa chèn: ${postRow.platform_id}`);
  }
  return uuid;
}

export class XhsCrawler implements ICrawler {
  private client: XhsClient;
  private currentAccountId: string | null = null;
  private browserContext: BrowserContext | null = null;
  private browserPage: Page | null = null;

  constructor() {
    this.client = new XhsClient();
  }

  async launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext> {
    if (this.browserContext) {
      return this.browserContext;
    }
    const { launchPersistentContext } = await import("cloakbrowser");
    const profileDir = join(process.cwd(), "output", "profiles", "xhs");

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

    // Chặn tài nguyên hình ảnh, media, font để tăng tốc
    await this.browserPage.route("**/*", (route: any) => {
      const type = route.request().resourceType();
      if (["image", "media", "font"].includes(type)) {
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
      const account = await checkoutAccount("xhs");
      if (!account) {
        break;
      }
      console.log(`Đang kiểm tra tài khoản XHS từ pool: ${account.username} (ID: ${account.id})...`);

      const context = await this.launchBrowser();
      const cookieDict = parseCookieString(account.cookie_data);
      const cookieObjects = [".xiaohongshu.com", "www.xiaohongshu.com"].flatMap(domain =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );
      await context.addCookies(cookieObjects);

      const isActive = await this.client.pong();
      if (isActive) {
        console.log(`Tài khoản XHS ${account.username} hoạt động tốt. Sẵn sàng cào.`);
        this.currentAccountId = account.id;
        const freshCookies = await context.cookies();
        await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
        return;
      } else {
        console.log(`Tài khoản XHS ${account.username} không hoạt động. Trả lại pool với đánh dấu lỗi...`);
        await checkinAccount(account.id, false);
        this.currentAccountId = null;
        attempts++;
      }
    }

    // 2. Dự phòng: Sử dụng cookie cục bộ từ môi trường hoặc JSON session file
    console.log("Không có tài khoản hoạt động nào từ Pool DB. Đang thử bằng cookie cục bộ...");
    const context = await this.launchBrowser();

    let localCookie = process.env.XHS_COOKIE || "";
    if (!localCookie) {
      try {
        const sessionPath = join(process.cwd(), "output", "xhs_session.json");
        const content = await readFile(sessionPath, "utf8");
        localCookie = JSON.parse(content).cookie || "";
      } catch {}
    }

    if (localCookie) {
      const cookieDict = parseCookieString(localCookie);
      const cookieObjects = [".xiaohongshu.com", "www.xiaohongshu.com"].flatMap(domain =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );
      await context.addCookies(cookieObjects);
    }

    const localIsActive = await this.client.pong();
    if (localIsActive) {
      console.log("Cookie cục bộ XHS hoạt động tốt.");
      this.currentAccountId = null;
      const freshCookies = await context.cookies();
      await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
      return;
    }

    // 3. Tiến hành đăng nhập thủ công bằng cookie mới nạp qua XhsLogin
    console.log("Cookie cục bộ hết hạn hoặc chưa đăng nhập. Tiến hành cấu hình qua XhsLogin...");
    const { XhsLogin } = await import("./login.js");
    try {
      const login = new XhsLogin({
        cookieStr: localCookie,
      });
      const result = await login.begin(context);
      if (!result.success) {
        console.log(`Đăng nhập không thành công: ${result.errorMessage}. Chạy chế độ khách (Guest)...`);
      } else {
        const cookieStr = result.cookies.map(c => `${c.name}=${c.value}`).join("; ");
        const sessionPath = join(process.cwd(), "output", "xhs_session.json");
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
   * # Thực hiện cào chi tiết bài đăng (note) trên XHS
   */
  async crawl(target: string): Promise<void> {
    let success = false;
    try {
      const urlInfo = parseNoteInfoFromUrl(target);
      await this.ensureLogin();

      let noteDetail = await this.client.getNoteById(urlInfo.noteId, urlInfo.xsecSource, urlInfo.xsecToken);
      if (!noteDetail || Object.keys(noteDetail).length === 0) {
        noteDetail = await this.client.getNoteByIdFromHtml(urlInfo.noteId, urlInfo.xsecSource, urlInfo.xsecToken, true);
      }

      if (!noteDetail || Object.keys(noteDetail).length === 0) {
        throw new Error(`Không tìm thấy thông tin chi tiết cho note XHS: ${urlInfo.noteId}`);
      }

      noteDetail.xsec_token = urlInfo.xsecToken;
      noteDetail.xsec_source = urlInfo.xsecSource;

      let authorUuid: string | undefined;
      if (noteDetail.user) {
        authorUuid = await persistAuthor(noteDetail.user);
      }

      const postUuid = await persistPost(noteDetail, authorUuid);

      if (process.env.ENABLE_GET_COMMENTS !== "false") {
        await this.client.getNoteAllComments({
          noteId: urlInfo.noteId,
          xsecToken: urlInfo.xsecToken,
          crawlInterval: 1.0,
          callback: async (_, comments) => {
            const commentRows = comments.map(c => XhsExtractor.extractComment(c, urlInfo.noteId, postUuid));
            await upsertComments(commentRows);
          },
          maxCount: 50
        });
      }
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Thực hiện cào profile creator và bài đăng của họ trên XHS
   */
  async creator(target: string): Promise<void> {
    let success = false;
    try {
      const creatorInfoUrl = parseCreatorInfoFromUrl(target);
      await this.ensureLogin();

      const creatorInfo = await this.client.getCreatorInfo(
        creatorInfoUrl.userId,
        creatorInfoUrl.xsecToken,
        creatorInfoUrl.xsecSource
      );
      if (!creatorInfo) {
        throw new Error(`Không lấy được thông tin creator XHS: ${creatorInfoUrl.userId}`);
      }

      const authorUuid = await persistAuthor(creatorInfo);

      const allNotes = await this.client.getAllNotesByCreator({
        userId: creatorInfoUrl.userId,
        crawlInterval: 2.0,
        xsecToken: creatorInfoUrl.xsecToken,
        xsecSource: creatorInfoUrl.xsecSource,
        maxCount: 20
      });

      for (const note of allNotes) {
        const noteId = note.note_id || note.id;
        if (!noteId) continue;

        let detailedNote = note;
        const xsecToken = note.xsec_token || note.xsecToken || "";
        const xsecSource = note.xsec_source || note.xsecSource || "pc_feed";

        try {
          const res = await this.client.getNoteById(noteId, xsecSource, xsecToken);
          if (res && Object.keys(res).length > 0) {
            detailedNote = res;
          }
        } catch (err) {
          console.warn(`[XhsCrawler] Không lấy được chi tiết note ${noteId}, sử dụng dữ liệu từ list.`);
        }

        detailedNote.xsec_token = xsecToken;
        detailedNote.xsec_source = xsecSource;

        const postUuid = await persistPost(detailedNote, authorUuid);

        if (process.env.ENABLE_GET_COMMENTS !== "false") {
          await this.client.getNoteAllComments({
            noteId,
            xsecToken,
            crawlInterval: 1.0,
            callback: async (_, comments) => {
              const commentRows = comments.map(c => XhsExtractor.extractComment(c, noteId, postUuid));
              await upsertComments(commentRows);
            },
            maxCount: 20
          });
        }
      }

      console.log(`Đã hoàn thành cào ${allNotes.length} note của Creator: ${creatorInfoUrl.userId}`);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Tìm kiếm note trên XHS theo từ khóa
   */
  async search(keyword: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      const limit = maxCount || 20;
      await this.ensureLogin();

      let page = 1;
      let crawledCount = 0;
      let hasMore = true;
      const searchId = getSearchId();

      while (hasMore && crawledCount < limit) {
        console.log(`Đang tìm kiếm từ khóa "${keyword}" trên XHS, trang ${page}...`);
        const searchRes = await this.client.getNoteByKeyword({
          keyword,
          searchId,
          page,
          pageSize: 20
        });

        if (!searchRes || !searchRes.items) {
          console.warn(`[XhsCrawler] Lỗi hoặc không có kết quả tìm kiếm cho từ khóa: ${keyword}`);
          break;
        }

        hasMore = searchRes.has_more || searchRes.hasMore || false;
        const items = searchRes.items || [];
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of items) {
          if (crawledCount >= limit) {
            break;
          }
          if (item.model_type === "rec_query" || item.model_type === "hot_query") {
            continue;
          }

          const noteId = item.id || item.note_id;
          if (!noteId) continue;

          const xsecSource = item.xsec_source || item.xsecSource || "pc_search";
          const xsecToken = item.xsec_token || item.xsecToken || "";

          let authorUuid: string | undefined;
          if (item.note_card?.user || item.noteCard?.user) {
            authorUuid = await persistAuthor(item.note_card?.user || item.noteCard?.user);
          }

          let detailedNote = item.note_card || item.noteCard || item;
          try {
            const res = await this.client.getNoteById(noteId, xsecSource, xsecToken);
            if (res && Object.keys(res).length > 0) {
              detailedNote = res;
            }
          } catch (err) {
            console.warn(`[XhsCrawler] Không lấy được chi tiết cho note tìm kiếm ${noteId}`);
          }

          detailedNote.xsec_token = xsecToken;
          detailedNote.xsec_source = xsecSource;

          const postUuid = await persistPost(detailedNote, authorUuid);

          if (process.env.ENABLE_GET_COMMENTS !== "false") {
            await this.client.getNoteAllComments({
              noteId,
              xsecToken,
              crawlInterval: 1.0,
              callback: async (_, comments) => {
                const commentRows = comments.map(c => XhsExtractor.extractComment(c, noteId, postUuid));
                await upsertComments(commentRows);
              },
              maxCount: 10
            });
          }

          crawledCount++;
        }

        page++;
        await new Promise(r => setTimeout(r, 2000));
      }

      console.log(`Đã hoàn thành tìm kiếm cho từ khóa "${keyword}" với ${crawledCount} kết quả.`);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Cào bình luận của note trên XHS
   */
  async comments(target: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      const urlInfo = parseNoteInfoFromUrl(target);
      const limit = maxCount || 50;
      await this.ensureLogin();

      const postUuid = await getPostUuid("xhs", urlInfo.noteId);
      if (!postUuid) {
        throw new Error(`Chưa cào bài đăng này, hãy cào bài đăng trước khi cào comment: ${urlInfo.noteId}`);
      }

      await this.client.getNoteAllComments({
        noteId: urlInfo.noteId,
        xsecToken: urlInfo.xsecToken,
        crawlInterval: 1.0,
        callback: async (_, comments) => {
          const commentRows = comments.map(c => XhsExtractor.extractComment(c, urlInfo.noteId, postUuid));
          await upsertComments(commentRows);
        },
         maxCount: limit
      });

      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }
}
