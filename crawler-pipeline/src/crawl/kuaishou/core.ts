/**
 * # Crawler chính cho Kuaishou (快手) — điều phối search, detail, creator, comments
 */

import { KuaishouClient } from "./client.js";
import { KuaishouExtractor } from "./extractor.js";
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

async function downloadKuaishouMedia(url: string): Promise<Buffer> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!resp.ok) {
    throw new Error(`Không thể tải tài nguyên Kuaishou: status ${resp.status}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function persistAuthor(rawCreator: any): Promise<string> {
  const authorRow = KuaishouExtractor.extractAuthor(rawCreator);

  let avatarUrlR2 = "";
  if (authorRow.avatar_url) {
    try {
      const exists = await checkMediaExistsInR2("kuaishou", authorRow.platform_uid, "avatar.jpg");
      if (exists) {
        avatarUrlR2 = `kuaishou/${authorRow.platform_uid}/avatar.jpg`;
      } else {
        const avatarBuf = await downloadKuaishouMedia(authorRow.avatar_url);
        avatarUrlR2 = await uploadMediaToR2("kuaishou", authorRow.platform_uid, "avatar.jpg", avatarBuf, "image/jpeg");
      }
    } catch (e) {
      console.log(`[KuaishouCrawler] Không thể tải avatar của tác giả lên R2:`, e);
      avatarUrlR2 = authorRow.avatar_url; // fallback
    }
  }

  authorRow.avatar_url = avatarUrlR2 || undefined;
  return await upsertAuthor(authorRow);
}

async function persistPost(videoItem: any, authorUuid?: string): Promise<string> {
  const postRow = KuaishouExtractor.extractPost(videoItem, authorUuid);

  // 1. Xác định media type và original URLs
  const isVideo = !!KuaishouExtractor.extractVideoPlayUrl(videoItem);
  const mediaType = isVideo ? "video" : (postRow.media_urls && postRow.media_urls.length > 1 ? "carousel" : "image");
  
  const originalMediaUrls = [...(postRow.media_urls || [])];
  const originalCoverUrl = postRow.cover_url || "";

  // 2. Xử lý R2 cache
  const mediaUrls: string[] = [];
  let coverUrl = originalCoverUrl;

  const uploadR2Enabled = process.env.ENABLE_UPLOAD_R2 !== "false";
  let mediaSource = "original";
  let mediaStatus = "original_only";
  let mediaError: string | null = null;
  let mediaCachedAt: string | null = null;

  if (uploadR2Enabled) {
    let totalToUpload = 0;
    let successUploads = 0;

    try {
      mediaSource = "r2";

      // Upload media URLs lên R2
      if (originalMediaUrls && originalMediaUrls.length > 0) {
        for (let i = 0; i < originalMediaUrls.length; i++) {
          const originalUrl = originalMediaUrls[i];
          const ext = originalUrl.split(".").pop()?.split("?")[0] || (isVideo ? "mp4" : "jpg");
          const filename = `media_${i}.${ext}`;
          totalToUpload++;
          const exists = await checkMediaExistsInR2("kuaishou", postRow.platform_id, filename);
          if (exists) {
            mediaUrls.push(`kuaishou/${postRow.platform_id}/${filename}`);
            successUploads++;
          } else {
            const buf = await downloadKuaishouMedia(originalUrl);
            const mimeType = ext === "mp4" ? "video/mp4" : "image/jpeg";
            const r2Url = await uploadMediaToR2("kuaishou", postRow.platform_id, filename, buf, mimeType);
            if (r2Url) {
              mediaUrls.push(r2Url);
              successUploads++;
            }
          }
        }
      }

      // Upload cover URL lên R2
      if (originalCoverUrl) {
        const filename = "cover.jpg";
        totalToUpload++;
        const exists = await checkMediaExistsInR2("kuaishou", postRow.platform_id, filename);
        if (exists) {
          coverUrl = `kuaishou/${postRow.platform_id}/${filename}`;
          successUploads++;
        } else {
          const buf = await downloadKuaishouMedia(originalCoverUrl);
          const r2CoverUrl = await uploadMediaToR2("kuaishou", postRow.platform_id, filename, buf, "image/jpeg");
          if (r2CoverUrl) {
            coverUrl = r2CoverUrl;
            successUploads++;
          }
        }
      }

      // Đánh giá trạng thái thực tế sau upload
      if (totalToUpload === 0) {
        mediaSource = "none";
        mediaStatus = "unavailable";
      } else if (successUploads === totalToUpload) {
        mediaStatus = "cached";
        mediaCachedAt = new Date().toISOString();
      } else if (successUploads === 0) {
        mediaSource = "original";
        mediaStatus = "failed";
        mediaError = "Không có media nào upload thành công lên R2";
        mediaUrls.length = 0;
        mediaUrls.push(...originalMediaUrls);
        coverUrl = originalCoverUrl;
      } else {
        mediaSource = "mixed";
        mediaStatus = "cached";
        mediaCachedAt = new Date().toISOString();
      }

    } catch (e: any) {
      console.log(`[KuaishouCrawler] Lỗi upload R2 cho bài viết ${postRow.platform_id}:`, e);
      mediaSource = "original";
      mediaStatus = "failed";
      mediaError = e.message || "Lỗi upload R2";
      
      mediaUrls.length = 0;
      mediaUrls.push(...originalMediaUrls);
      coverUrl = originalCoverUrl;
    }
  } else {
    mediaUrls.push(...originalMediaUrls);
    if (originalMediaUrls.length === 0 && !originalCoverUrl) {
      mediaSource = "none";
      mediaStatus = "unavailable";
    } else {
      mediaSource = "original";
      mediaStatus = "original_only";
    }
  }

  // Cập nhật postRow với dữ liệu mới
  postRow.media_type = mediaType;
  postRow.media_urls = mediaUrls;
  postRow.cover_url = coverUrl || undefined;
  postRow.original_media_urls = originalMediaUrls;
  postRow.original_cover_url = originalCoverUrl || undefined;
  postRow.media_status = mediaStatus;
  postRow.media_source = mediaSource;
  postRow.media_error = mediaError;
  postRow.media_cached_at = mediaCachedAt || undefined;

  await upsertPost(postRow);
  const uuid = await getPostUuid("kuaishou", postRow.platform_id);
  if (!uuid) {
    throw new Error(`Không thể lấy UUID của bài đăng vừa chèn: ${postRow.platform_id}`);
  }
  return uuid;
}

function parsePhotoId(target: string): string {
  if (!target.includes("http") && !target.includes("kuaishou.com")) {
    return target.trim();
  }
  const match = target.match(/\/short-video\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  throw new Error(`Không thể phân tích ID video từ URL Kuaishou: ${target}`);
}

function parseUserId(target: string): string {
  if (!target.includes("http") && !target.includes("kuaishou.com")) {
    return target.trim();
  }
  const match = target.match(/\/profile\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  throw new Error(`Không thể phân tích ID user từ URL Kuaishou: ${target}`);
}

export class KuaishouCrawler implements ICrawler {
  private client: KuaishouClient;
  private currentAccountId: string | null = null;
  private browserContext: BrowserContext | null = null;
  private browserPage: Page | null = null;

  constructor() {
    this.client = new KuaishouClient();
  }

  async launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext> {
    if (this.browserContext) {
      return this.browserContext;
    }
    const { launchPersistentContext } = await import("cloakbrowser");
    const profileDir = join(process.cwd(), "output", "profiles", "kuaishou");

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
      const account = await checkoutAccount("kuaishou");
      if (!account) {
        break;
      }
      console.log(`Đang kiểm tra tài khoản Kuaishou từ pool: ${account.username} (ID: ${account.id})...`);

      const context = await this.launchBrowser();
      const cookieDict = parseCookieString(account.cookie_data);
      const cookieObjects = [".kuaishou.com", "www.kuaishou.com"].flatMap(domain =>
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
        console.log(`Tài khoản Kuaishou ${account.username} hoạt động tốt. Sẵn sàng cào.`);
        this.currentAccountId = account.id;
        const freshCookies = await context.cookies();
        await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
        return;
      } else {
        console.log(`Tài khoản Kuaishou ${account.username} không hoạt động. Trả lại pool với đánh dấu lỗi...`);
        await checkinAccount(account.id, false);
        this.currentAccountId = null;
        attempts++;
      }
    }

    // 2. Dự phòng: Sử dụng cookie cục bộ từ môi trường hoặc JSON session file
    console.log("Không có tài khoản hoạt động nào từ Pool DB. Đang thử bằng cookie cục bộ...");
    const context = await this.launchBrowser();

    let localCookie = process.env.KUAISHOU_COOKIE || "";
    if (!localCookie) {
      try {
        const sessionPath = join(process.cwd(), "output", "kuaishou_session.json");
        const content = await readFile(sessionPath, "utf8");
        localCookie = JSON.parse(content).cookie || "";
      } catch {}
    }

    if (localCookie) {
      const cookieDict = parseCookieString(localCookie);
      const cookieObjects = [".kuaishou.com", "www.kuaishou.com"].flatMap(domain =>
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
      console.log("Cookie cục bộ Kuaishou hoạt động tốt.");
      this.currentAccountId = null;
      const freshCookies = await context.cookies();
      await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
      return;
    }

    // 3. Tiến hành đăng nhập thủ công bằng cookie mới nạp qua KuaishouLogin
    console.log("Cookie cục bộ hết hạn hoặc chưa đăng nhập. Tiến hành cấu hình qua KuaishouLogin...");
    const { KuaishouLogin } = await import("./login.js");
    try {
      const login = new KuaishouLogin({
        cookieStr: localCookie,
      });
      const result = await login.begin(context);
      if (!result.success) {
        console.log(`Đăng nhập không thành công: ${result.errorMessage}. Chạy chế độ khách (Guest)...`);
      } else {
        const cookieStr = result.cookies.map(c => `${c.name}=${c.value}`).join("; ");
        const sessionPath = join(process.cwd(), "output", "kuaishou_session.json");
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
   * # Thực hiện cào chi tiết video Kuaishou
   */
  async crawl(target: string): Promise<void> {
    let success = false;
    try {
      const photoId = parsePhotoId(target);
      await this.ensureLogin();

      const detailRes = await this.client.getVideoInfo(photoId);
      const detail = detailRes?.visionVideoDetail;
      if (!detail || !detail.photo) {
        throw new Error(`Không tìm thấy thông tin chi tiết cho video Kuaishou: ${photoId}`);
      }

      let authorUuid: string | undefined;
      if (detail.author) {
        authorUuid = await persistAuthor(detail);
      }

      const postUuid = await persistPost(detail, authorUuid);

      // Cào bình luận nếu được cấu hình
      if (process.env.ENABLE_GET_COMMENTS !== "false") {
        await this.client.getVideoAllComments(
          photoId,
          1.0,
          async (_, comments) => {
            const commentRows = comments.map(c => KuaishouExtractor.extractComment(c, photoId, postUuid));
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
   * # Thực hiện cào profile creator và video của họ trên Kuaishou
   */
  async creator(target: string): Promise<void> {
    let success = false;
    try {
      const userId = parseUserId(target);
      await this.ensureLogin();

      // Lấy thông tin tác giả
      const creatorInfo = await this.client.getCreatorInfo(userId);
      if (!creatorInfo) {
        throw new Error(`Không lấy được thông tin creator Kuaishou: ${userId}`);
      }

      const authorUuid = await persistAuthor(creatorInfo);

      // Lấy danh sách video của creator
      const allFeeds = await this.client.getAllVideosByCreator(
        userId,
        2.0,
        async (feeds) => {
          for (const feed of feeds) {
            const photoId = feed.photo?.id;
            if (!photoId) continue;

            let detailedItem = feed;
            try {
              const detailRes = await this.client.getVideoInfo(photoId);
              if (detailRes?.visionVideoDetail) {
                detailedItem = detailRes.visionVideoDetail;
              }
            } catch (err) {
              console.warn(`[KuaishouCrawler] Không lấy được chi tiết cho video ${photoId}, sử dụng dữ liệu từ feed.`);
            }

            const postUuid = await persistPost(detailedItem, authorUuid);

            // Cào bình luận cho từng video của creator
            if (process.env.ENABLE_GET_COMMENTS !== "false") {
              await this.client.getVideoAllComments(
                photoId,
                1.0,
                async (_, comments) => {
                  const commentRows = comments.map(c => KuaishouExtractor.extractComment(c, photoId, postUuid));
                  await upsertComments(commentRows);
                },
                20 // giới hạn bình luận của creator để tránh rate limit
              );
            }
          }
        }
      );

      console.log(`Đã hoàn thành cào ${allFeeds.length} video của Creator: ${userId}`);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Tìm kiếm video Kuaishou theo từ khóa
   */
  async search(keyword: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      const limit = maxCount || 20;
      await this.ensureLogin();

      let page = 1;
      let crawledCount = 0;
      let hasMore = true;
      let searchSessionId = "";

      while (hasMore && crawledCount < limit) {
        console.log(`Đang tìm kiếm từ khóa "${keyword}" trên Kuaishou, trang ${page}...`);
        const searchRes = await this.client.searchInfoByKeyword(keyword, String(page), searchSessionId);
        const searchPhoto = searchRes?.visionSearchPhoto;

        if (!searchPhoto || searchPhoto.result !== 1) {
          console.warn(`[KuaishouCrawler] Lỗi hoặc không có kết quả tìm kiếm cho từ khóa: ${keyword}`);
          break;
        }

        searchSessionId = searchPhoto.searchSessionId || "";
        const feeds = searchPhoto.feeds || [];

        if (feeds.length === 0) {
          hasMore = false;
          break;
        }

        for (const feed of feeds) {
          if (crawledCount >= limit) {
            break;
          }

          const photoId = feed.photo?.id;
          if (!photoId) continue;

          let authorUuid: string | undefined;
          if (feed.author) {
            authorUuid = await persistAuthor({
              profile: {
                user_id: feed.author.id,
                user_name: feed.author.name,
                headurl: feed.author.headerUrl,
              }
            });
          }

          let detailedItem = feed;
          try {
            const detailRes = await this.client.getVideoInfo(photoId);
            if (detailRes?.visionVideoDetail) {
              detailedItem = detailRes.visionVideoDetail;
            }
          } catch (err) {
            console.warn(`[KuaishouCrawler] Không lấy được chi tiết cho video tìm kiếm ${photoId}.`);
          }

          const postUuid = await persistPost(detailedItem, authorUuid);

          // Cào bình luận
          if (process.env.ENABLE_GET_COMMENTS !== "false") {
            await this.client.getVideoAllComments(
              photoId,
              1.0,
              async (_, comments) => {
                const commentRows = comments.map(c => KuaishouExtractor.extractComment(c, photoId, postUuid));
                await upsertComments(commentRows);
              },
              10
            );
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
   * # Cào bình luận của video Kuaishou
   */
  async comments(target: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      const photoId = parsePhotoId(target);
      const limit = maxCount || 50;
      await this.ensureLogin();

      const postUuid = await getPostUuid("kuaishou", photoId);
      if (!postUuid) {
        throw new Error(`Chưa cào bài đăng này, hãy cào bài đăng trước khi cào comment: ${photoId}`);
      }

      await this.client.getVideoAllComments(
        photoId,
        1.0,
        async (_, comments) => {
          const commentRows = comments.map(c => KuaishouExtractor.extractComment(c, photoId, postUuid));
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
