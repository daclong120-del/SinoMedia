/**
 * # Crawler chính cho Tieba (百度贴吧) — điều phối search, detail, creator, comments
 */

import { TiebaClient } from "./client.js";
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
import type { TiebaNote, TiebaComment, TiebaCreator } from "../../model/tieba.js";

async function downloadMedia(url: string): Promise<Buffer> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!resp.ok) {
    throw new Error(`Tải ảnh thất bại: status ${resp.status}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function persistAuthor(authorInfo: {
  uid: string;
  nickname: string;
  avatarUrl?: string;
  gender?: string;
  description?: string;
  followsCount?: number;
  fansCount?: number;
  interactionCount?: number;
  ipLocation?: string;
  raw?: any;
}): Promise<string> {
  let avatarUrlR2 = "";
  if (authorInfo.avatarUrl) {
    try {
      const exists = await checkMediaExistsInR2("tieba", authorInfo.uid, "avatar.jpg");
      if (exists) {
        avatarUrlR2 = `tieba/${authorInfo.uid}/avatar.jpg`;
      } else {
        const avatarBuf = await downloadMedia(authorInfo.avatarUrl);
        avatarUrlR2 = await uploadMediaToR2("tieba", authorInfo.uid, "avatar.jpg", avatarBuf, "image/jpeg");
      }
    } catch (e) {
      console.log(`[TiebaCrawler] Không thể tải avatar của tác giả lên R2:`, e);
      avatarUrlR2 = authorInfo.avatarUrl; // fallback to original
    }
  }

  return await upsertAuthor({
    platform: "tieba",
    platform_uid: authorInfo.uid,
    nickname: authorInfo.nickname,
    avatar_url: avatarUrlR2 || undefined,
    gender: authorInfo.gender,
    description: authorInfo.description,
    follows_count: authorInfo.followsCount,
    fans_count: authorInfo.fansCount,
    interaction_count: authorInfo.interactionCount,
    ip_location: authorInfo.ipLocation,
    raw: authorInfo.raw,
  });
}

async function persistPost(note: TiebaNote, authorUuid?: string): Promise<string> {
  const postData: CrawledPostRow = {
    platform: "tieba",
    platform_id: note.note_id || "",
    author_id: authorUuid,
    caption: `${note.title || ""}\n${note.desc || ""}`.trim(),
    media_urls: [],
    stats: {
      digg_count: 0,
      comment_count: note.total_replay_num || 0,
      share_count: 0,
      play_count: 0,
    },
    raw: note,
    published_at: note.publish_time || new Date().toISOString(),
  };

  await upsertPost(postData);
  const uuid = await getPostUuid("tieba", note.note_id || "");
  if (!uuid) {
    throw new Error(`Failed to retrieve UUID for inserted note: ${note.note_id}`);
  }
  return uuid;
}

function mapTiebaComment(c: TiebaComment, platformPostId: string, postUuid?: string) {
  let uid = "";
  if (c.user_link) {
    const match = c.user_link.match(/[?&]id=([^&]+)/);
    if (match) {
      uid = decodeURIComponent(match[1]);
    }
  }

  return {
    platform: "tieba",
    platform_cid: c.comment_id || "",
    post_id: postUuid,
    platform_post_id: platformPostId,
    parent_cid: c.parent_comment_id || undefined,
    author_uid: uid || c.user_nickname || "",
    author_nickname: c.user_nickname || "",
    content: c.content || "",
    like_count: 0,
    raw: c,
    published_at: c.publish_time ? new Date(c.publish_time).toISOString() : new Date().toISOString(),
  };
}

export class TiebaCrawler implements ICrawler {
  private client: TiebaClient;
  private currentAccountId: string | null = null;
  private browserContext: BrowserContext | null = null;
  private browserPage: Page | null = null;

  constructor() {
    this.client = new TiebaClient();
  }

  async launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext> {
    if (this.browserContext) {
      return this.browserContext;
    }
    const { launchPersistentContext } = await import("cloakbrowser");
    const profileDir = join(process.cwd(), "output", "profiles", "tieba");

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
    while (attempts < maxAttempts) {
      const account = await checkoutAccount("tieba");
      if (!account) {
        break;
      }
      console.log(`Đang kiểm tra tài khoản từ pool: ${account.username} (ID: ${account.id})...`);
      
      const context = await this.launchBrowser();
      const cookieDict = parseCookieString(account.cookie_data);
      const cookieObjects = Object.entries(cookieDict).map(([name, value]) => ({
        name,
        value,
        domain: ".baidu.com",
        path: "/",
      }));
      await context.addCookies(cookieObjects);

      const isActive = await this.client.pong(context);
      if (isActive) {
        console.log(`Tài khoản ${account.username} hoạt động tốt. Sẵn sàng cào.`);
        this.currentAccountId = account.id;
        return;
      } else {
        console.log(`Tài khoản ${account.username} không hoạt động hoặc bị chặn. Đang đánh dấu lỗi...`);
        await checkinAccount(account.id, false);
        this.currentAccountId = null;
        attempts++;
      }
    }

    console.log("Không có tài khoản hoạt động nào từ Pool DB. Đang thử bằng cookie cục bộ/môi trường...");
    const context = await this.launchBrowser();

    let localCookie = process.env.TIEBA_COOKIE || "";
    if (!localCookie) {
      try {
        const sessionPath = join(process.cwd(), "output", "tieba_session.json");
        const content = await readFile(sessionPath, "utf8");
        localCookie = JSON.parse(content).cookie || "";
      } catch {}
    }

    if (localCookie) {
      const cookieDict = parseCookieString(localCookie);
      const cookieObjects = Object.entries(cookieDict).map(([name, value]) => ({
        name,
        value,
        domain: ".baidu.com",
        path: "/",
      }));
      await context.addCookies(cookieObjects);
    }

    const localIsActive = await this.client.pong(context);
    if (localIsActive) {
      console.log("Cookie cục bộ/môi trường hoạt động tốt.");
      this.currentAccountId = null;
      return;
    }

    console.log("Cookie cục bộ hết hạn hoặc chưa đăng nhập. Tiến hành khởi chạy trình duyệt để thực hiện đăng nhập...");
    const { TiebaLogin } = await import("./login.js");
    try {
      const login = new TiebaLogin({
        cookieStr: localCookie,
      });
      const result = await login.begin(context);
      if (!result.success) {
        console.log(`Đăng nhập không thành công: ${result.errorMessage}. Chuyển sang chế độ ẩn danh (Guest)...`);
      } else {
        const cookieStr = result.cookies.map(c => `${c.name}=${c.value}`).join("; ");
        const sessionPath = join(process.cwd(), "output", "tieba_session.json");
        await mkdir(join(process.cwd(), "output"), { recursive: true });
        await writeFile(sessionPath, JSON.stringify({ cookie: cookieStr, updatedAt: new Date().toISOString() }, null, 2), "utf8");
        console.log("Đăng nhập thành công. Đã cập nhật và lưu cookie mới.");
      }
    } catch (err) {
      console.log(`Không thể hoàn thành đăng nhập: ${(err as Error).message}. Tiếp tục bằng chế độ ẩn danh (Guest)...`);
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
   * # Thực hiện cào chi tiết bài đăng Tieba
   */
  async crawl(target: string): Promise<void> {
    let success = false;
    try {
      let noteId = target;
      if (target.includes("/p/")) {
        const match = target.match(/\/p\/(\d+)/);
        if (match) noteId = match[1];
      }

      await this.ensureLogin();
      const note = await this.client.getNoteById(noteId);

      let authorUuid: string | undefined;
      if (note.user_link) {
        let uid = "";
        const match = note.user_link.match(/[?&]id=([^&]+)/);
        if (match) uid = decodeURIComponent(match[1]);
        if (uid) {
          authorUuid = await persistAuthor({
            uid,
            nickname: note.user_nickname || "",
            avatarUrl: note.user_avatar,
            ipLocation: note.ip_location,
            raw: note,
          });
        }
      }

      const postUuid = await persistPost(note, authorUuid);

      if (process.env.ENABLE_GET_COMMENTS === "true") {
        const maxComments = process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES
          ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10)
          : 50;

        const callback = async (nid: string, comments: TiebaComment[]) => {
          const mapped = comments.map(c => mapTiebaComment(c, nid, postUuid));
          await upsertComments(mapped);
        };

        await this.client.getNoteAllComments(note, 1.0, callback, maxComments);
      }

      success = true;
    } catch (e) {
      console.error("[TiebaCrawler.crawl] Error:", e);
      throw e;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Thực hiện cào profile creator và danh sách bài đăng của họ trên Tieba
   */
  async creator(target: string): Promise<void> {
    let success = false;
    try {
      await this.ensureLogin();
      const creatorInfo = await this.client.getCreatorInfoByUrl(target);

      const authorUuid = await persistAuthor({
        uid: creatorInfo.user_id || "",
        nickname: creatorInfo.nickname || creatorInfo.user_name || "",
        avatarUrl: creatorInfo.avatar,
        gender: creatorInfo.gender,
        description: `Đăng ký: ${creatorInfo.registration_duration || ""}`,
        followsCount: Number(creatorInfo.follows || 0),
        fansCount: Number(creatorInfo.fans || 0),
        ipLocation: creatorInfo.ip_location,
        raw: creatorInfo,
      });

      const maxPosts = process.env.CREATOR_MAX_POSTS ? parseInt(process.env.CREATOR_MAX_POSTS, 10) : 20;
      const notes = await this.client.getAllNotesByCreatorUrl(target, 1.0, undefined, maxPosts);

      for (const note of notes) {
        const postUuid = await persistPost(note, authorUuid);
        if (process.env.ENABLE_GET_COMMENTS === "true") {
          const maxComments = process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES
            ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10)
            : 50;

          const callback = async (nid: string, comments: TiebaComment[]) => {
            const mapped = comments.map(c => mapTiebaComment(c, nid, postUuid));
            await upsertComments(mapped);
          };

          await this.client.getNoteAllComments(note, 1.0, callback, maxComments);
        }
      }

      success = true;
    } catch (e) {
      console.error("[TiebaCrawler.creator] Error:", e);
      throw e;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Tìm kiếm bài đăng Tieba theo từ khóa
   */
  async search(keyword: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      await this.ensureLogin();
      const limit = maxCount || 20;
      const notes = await this.client.getNotesByKeyword(keyword, 1, limit);

      for (const note of notes) {
        let authorUuid: string | undefined;
        if (note.user_link) {
          let uid = "";
          const match = note.user_link.match(/[?&]id=([^&]+)/);
          if (match) uid = decodeURIComponent(match[1]);
          if (uid) {
            authorUuid = await persistAuthor({
              uid,
              nickname: note.user_nickname || "",
              avatarUrl: note.user_avatar,
              ipLocation: note.ip_location,
              raw: note,
            });
          }
        }

        const postUuid = await persistPost(note, authorUuid);

        if (process.env.ENABLE_GET_COMMENTS === "true") {
          const maxComments = process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES
            ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10)
            : 50;

          const callback = async (nid: string, comments: TiebaComment[]) => {
            const mapped = comments.map(c => mapTiebaComment(c, nid, postUuid));
            await upsertComments(mapped);
          };

          await this.client.getNoteAllComments(note, 1.0, callback, maxComments);
        }
      }

      success = true;
    } catch (e) {
      console.error("[TiebaCrawler.search] Error:", e);
      throw e;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Cào bình luận của bài đăng Tieba
   */
  async comments(target: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      let noteId = target;
      if (target.includes("/p/")) {
        const match = target.match(/\/p\/(\d+)/);
        if (match) noteId = match[1];
      }

      await this.ensureLogin();
      const note = await this.client.getNoteById(noteId);
      const postUuid = await getPostUuid("tieba", noteId);

      const limit = maxCount || 50;
      const callback = async (nid: string, comments: TiebaComment[]) => {
        const mapped = comments.map(c => mapTiebaComment(c, nid, postUuid));
        await upsertComments(mapped);
      };

      await this.client.getNoteAllComments(note, 1.0, callback, limit);
      success = true;
    } catch (e) {
      console.error("[TiebaCrawler.comments] Error:", e);
      throw e;
    } finally {
      await this.releaseAccount(success);
    }
  }
}
