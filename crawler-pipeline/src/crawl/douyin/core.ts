import { douyinGet, downloadMedia, sleep, CRAWL_SLEEP_MS, setDouyinSession, checkSessionAlive } from "./client.js";
import { upsertAuthor, upsertPost, upsertPosts, getPostUuid, upsertComments, checkoutAccount, checkinAccount } from "../../store/index.js";
import { DouyinAweme } from "../../model/douyin.js";
import { CrawledPostRow } from "../../model/storage.js";
import { CONFIG } from "../../config.js";
import type { ICrawler, BrowserLaunchOptions } from "../../base/base_crawler.js";
import type { BrowserContext } from "playwright-core";
let currentAccountId: string | null = null;

/**
 * # Đảm bảo trạng thái đăng nhập Douyin hợp lệ trước khi cào
 */
async function ensureLogin(): Promise<void> {
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    const account = await checkoutAccount("douyin");
    if (!account) {
      break;
    }
    console.log(`Đang kiểm tra tài khoản từ pool: ${account.username} (ID: ${account.id})...`);
    try {
      const data = JSON.parse(account.cookie_data);
      if (data && (data.cookies || data.msToken)) {
        setDouyinSession(data.cookies || [], data.msToken || "");
      } else if (Array.isArray(data)) {
        setDouyinSession(data, "");
      } else {
        setDouyinSession([], "");
      }
    } catch (err) {
      const cookies = account.cookie_data.split(";").map(part => {
        const trimmed = part.trim();
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const name = trimmed.substring(0, eqIdx);
          const value = trimmed.substring(eqIdx + 1);
          return { name, value, domain: ".douyin.com", path: "/" };
        }
        return null;
      }).filter(Boolean);
      const msTokenCookie = cookies.find(c => c && c.name === "msToken");
      const msToken = msTokenCookie ? msTokenCookie.value : "";
      setDouyinSession(cookies, msToken);
    }
    const isActive = await checkSessionAlive();
    if (isActive) {
      console.log(`Tài khoản ${account.username} hoạt động tốt. Sẵn sàng cào.`);
      currentAccountId = account.id;
      return;
    } else {
      console.log(`Tài khoản ${account.username} không hoạt động hoặc bị chặn. Đang đánh dấu lỗi...`);
      await checkinAccount(account.id, false);
      currentAccountId = null;
      attempts++;
    }
  }
  console.log("Không có tài khoản hoạt động nào từ Pool DB. Đang thử bằng cookie cục bộ...");
  setDouyinSession(null);
  const localIsActive = await checkSessionAlive();
  if (localIsActive) {
    console.log("Cookie cục bộ hoạt động tốt.");
    currentAccountId = null;
    return;
  }
  console.log("Cookie cục bộ hết hạn hoặc chưa đăng nhập. Tiến hành khởi chạy trình duyệt để đăng nhập...");
  const { closeBrowser } = await import("./client.js");
  const { DouyinLogin } = await import("./login.js");
  try {
    const { launchPersistentContext } = await import("cloakbrowser");
    const { join } = await import("node:path");
    const profileDir = join(process.cwd(), "output", "profiles", "douyin");
    const context = (await launchPersistentContext({
      userDataDir: profileDir,
      headless: CONFIG.headless,
      geoip: true,
      humanize: true,
    })) as any;
    const login = new DouyinLogin({
      browserContext: context,
      cookieStr: process.env.DOUYIN_COOKIE,
    });
    const result = await login.begin(context);
    if (!result.success) {
      console.log(`Đăng nhập không thành công: ${result.errorMessage}. Chuyển sang chế độ ẩn danh (Guest)...`);
    } else {
      const { saveSession } = await import("../../sign/session_store.js");
      await saveSession({ cookies: result.cookies, msToken: result.msToken || "" });
      console.log("Đăng nhập thành công. Đã cập nhật và lưu cookie mới.");
    }
  } catch (err) {
    console.log(`Không thể hoàn thành đăng nhập: ${(err as Error).message}. Tiếp tục bằng chế độ ẩn danh (Guest)...`);
  } finally {
    await closeBrowser();
  }
}

/**
 * # Phân giải link ngắn v.douyin.com để lấy link đầy đủ chứa ID
 */
export async function resolveShortUrl(shortUrl: string): Promise<string> {
  if (!shortUrl.includes("v.douyin.com")) {
    return shortUrl;
  }
  try {
    const res = await fetch(shortUrl, { method: "GET", redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      return res.headers.get("location") || "";
    }
    return "";
  } catch (err) {
    throw new Error(`Lỗi phân giải short URL: ${(err as Error).message}`);
  }
}

/**
 * # Trích xuất aweme_id (ID video) từ URL Douyin bất kỳ
 */
export function extractAwemeId(url: string): string {
  if (/^\d+$/.test(url)) {
    return url;
  }
  const match = url.match(/\/video\/(\d+)/);
  if (match) {
    return match[1];
  }
  const modalMatch = url.match(/[?&]modal_id=(\d+)/);
  if (modalMatch) {
    return modalMatch[1];
  }
  throw new Error("Không thể trích xuất ID video từ URL cung cấp");
}

/**
 * # Lưu thông tin tác giả và bài đăng chi tiết vào Supabase + upload R2
 */
export async function persistAweme(
  detail: DouyinAweme,
  options?: { authorUuid?: string; skipDbWrite?: boolean }
): Promise<CrawledPostRow> {
  const awemeId = detail.aweme_id;
  const authorData = detail.author;
  let authorUuid = options?.authorUuid;
  if (!authorUuid) {
    const rawAvatarUrl = authorData?.avatar_thumb?.url_list?.[0] || authorData?.avatar_larger?.url_list?.[0];
    authorUuid = await upsertAuthor({
      platform: "douyin",
      platform_uid: authorData?.sec_uid || "unknown",
      nickname: authorData?.nickname || "Người dùng Douyin",
      avatar_url: rawAvatarUrl || undefined,
      raw: authorData,
    });
  }

  // 1. Xác định media type
  let mediaType = "unknown";
  if (detail.video) {
    mediaType = "video";
  } else if (detail.images && Array.isArray(detail.images)) {
    mediaType = detail.images.length > 1 ? "carousel" : "image";
  } else {
    mediaType = "image";
  }

  // 2. Thu thập original URLs
  const originalMediaUrls: string[] = [];
  let originalCoverUrl = "";

  if (detail.video) {
    const videoUrl = detail.video.play_addr?.url_list?.[0];
    if (videoUrl) originalMediaUrls.push(videoUrl);
    
    const coverUrlVal = detail.video.cover?.url_list?.[0];
    if (coverUrlVal) originalCoverUrl = coverUrlVal;
  }

  if (detail.images && Array.isArray(detail.images)) {
    for (const img of detail.images) {
      const imgUrl = img.display_image_width_goods?.url_list?.[0] || img.url_list?.[0];
      if (imgUrl) {
        originalMediaUrls.push(imgUrl);
      }
    }
    if (originalMediaUrls.length > 0 && !originalCoverUrl) {
      originalCoverUrl = originalMediaUrls[0];
    }
  }

  // 3. Xử lý R2 cache (removed)
  const mediaUrls: string[] = [...originalMediaUrls];
  let coverUrl = originalCoverUrl;
  
  let mediaSource = "original";
  let mediaStatus = "original_only";
  let mediaError: string | null = null;
  let mediaCachedAt: string | null = null;

  if (originalMediaUrls.length === 0 && !originalCoverUrl) {
    mediaSource = "none";
    mediaStatus = "unavailable";
  }

  const publishedAt = detail.create_time ? new Date(detail.create_time * 1000).toISOString() : new Date().toISOString();

  const postData: CrawledPostRow = {
    platform: "douyin",
    platform_id: awemeId,
    author_id: authorUuid,
    caption: detail.desc || "",
    media_urls: mediaUrls,
    cover_url: coverUrl || undefined,
    stats: {
      digg_count: detail.statistics?.digg_count ?? 0,
      comment_count: detail.statistics?.comment_count ?? 0,
      share_count: detail.statistics?.share_count ?? 0,
      play_count: detail.statistics?.play_count ?? 0,
    },
    raw: detail,
    published_at: publishedAt,
    media_type: mediaType,
    original_media_urls: originalMediaUrls,
    original_cover_url: originalCoverUrl || undefined,
    media_status: mediaStatus,
    media_source: mediaSource,
    media_error: mediaError,
    media_cached_at: mediaCachedAt || undefined,
  };

  if (!options?.skipDbWrite) {
    await upsertPost(postData);
  }

  return postData;
}

/**
 * # Xác thực tính đúng đắn của dữ liệu aweme_detail
 */
function validateAwemeDetail(detail: any): DouyinAweme {
  if (!detail || typeof detail !== "object") {
    throw new Error("Dữ liệu chi tiết video không hợp lệ (không phải object)");
  }
  if (!detail.aweme_id || typeof detail.aweme_id !== "string") {
    throw new Error("Dữ liệu chi tiết video thiếu aweme_id hoặc aweme_id không phải string");
  }
  if (detail.video && typeof detail.video !== "object") {
    throw new Error(`Video ${detail.aweme_id} chứa trường video không hợp lệ`);
  }
  if (detail.statistics && typeof detail.statistics !== "object") {
    throw new Error(`Video ${detail.aweme_id} chứa trường statistics không hợp lệ`);
  }
  return detail as DouyinAweme;
}

/**
 * # Xác thực tính đúng đắn của phản hồi profile creator
 */
function validateUserProfile(res: any): void {
  if (!res || typeof res !== "object") {
    throw new Error("Dữ liệu profile creator không hợp lệ");
  }
  if (!res.user || typeof res.user !== "object") {
    throw new Error("Dữ liệu profile creator thiếu thông tin user");
  }
  if (!res.user.sec_uid || typeof res.user.sec_uid !== "string") {
    throw new Error("Dữ liệu profile creator thiếu sec_uid hợp lệ");
  }
}

/**
 * # Cào chi tiết một video từ Douyin và thực hiện upload media + lưu DB
 */
export async function crawlVideo(urlOrId: string): Promise<void> {
  const resolvedUrl = await resolveShortUrl(urlOrId);
  const awemeId = extractAwemeId(resolvedUrl || urlOrId);

  const res = await douyinGet("/aweme/v1/web/aweme/detail/", { aweme_id: awemeId });
  const detail = validateAwemeDetail(res.aweme_detail);

  await persistAweme(detail);
}

/**
 * # Trích xuất sec_user_id từ URL creator
 */
export async function extractSecUserId(url: string): Promise<string> {
  if (url.startsWith("MS4wLjABAAAA") || (!url.startsWith("http") && !url.includes("douyin.com"))) {
    return url;
  }
  const resolvedUrl = await resolveShortUrl(url);
  const match = resolvedUrl.match(/\/user\/([^/?]+)/);
  if (match) {
    return match[1];
  }
  throw new Error("Không thể trích xuất ID kênh (sec_user_id) từ URL cung cấp");
}

/**
 * # Cào toàn bộ video từ một creator và lưu vào DB + R2
 */
export async function crawlCreator(urlOrSecUid: string): Promise<void> {
  const secUserId = await extractSecUserId(urlOrSecUid);

  console.log(`Bắt đầu cào thông tin creator cho sec_user_id: ${secUserId}`);
  const userProfileRes = await douyinGet("/aweme/v1/web/user/profile/other/", {
    sec_user_id: secUserId,
    publish_video_strategy_type: "2",
    personal_center_strategy: "1",
  });

  validateUserProfile(userProfileRes);
  const user = userProfileRes.user;

  console.log(`Tìm thấy creator: ${user.nickname}`);
  const authorUuid = await upsertAuthor({
    platform: "douyin",
    platform_uid: secUserId,
    nickname: user.nickname || "Người dùng Douyin",
    avatar_url: user.avatar_thumb?.url_list?.[0] || user.avatar_larger?.url_list?.[0] || undefined,
    raw: user,
  });

  const maxPosts = process.env.CREATOR_MAX_POSTS ? parseInt(process.env.CREATOR_MAX_POSTS, 10) : Infinity;
  let maxCursor = "0";
  let hasMore = 1;
  let crawlCount = 0;

  console.log(`Bắt đầu cào danh sách video của creator, giới hạn tối đa: ${maxPosts}`);

  while (hasMore === 1 && crawlCount < maxPosts) {
    const postRes = await douyinGet("/aweme/v1/web/aweme/post/", {
      sec_user_id: secUserId,
      count: "18",
      max_cursor: maxCursor,
      locate_query: "false",
      publish_video_strategy_type: "2",
    });

    hasMore = postRes.has_more ?? 0;
    maxCursor = postRes.max_cursor ? String(postRes.max_cursor) : "0";
    const awemeList = postRes.aweme_list || [];

    console.log(`Lấy được trang video mới với ${awemeList.length} video. maxCursor tiếp theo: ${maxCursor}`);

    if (awemeList.length === 0) {
      break;
    }

    const pagePosts: CrawledPostRow[] = [];
    for (const item of awemeList) {
      if (crawlCount >= maxPosts) {
        break;
      }

      console.log(`Đang xử lý video thứ ${crawlCount + 1}: ${item.aweme_id} - ${item.desc || "Không tiêu đề"}`);

      try {
        let detail = item;
        const needsRefetch = !item.video?.play_addr?.url_list?.[0] && !(item.images && item.images.length > 0);
        if (needsRefetch) {
          console.log(`Video ${item.aweme_id} thiếu link media, tiến hành re-fetch chi tiết...`);
          const detailRes = await douyinGet("/aweme/v1/web/aweme/detail/", { aweme_id: item.aweme_id });
          detail = validateAwemeDetail(detailRes.aweme_detail);
        } else {
          detail = validateAwemeDetail(item);
        }

        const postRow = await persistAweme(detail, { authorUuid, skipDbWrite: true });
        pagePosts.push(postRow);
        crawlCount++;
      } catch (err) {
        console.log(`Lỗi khi xử lý video ${item.aweme_id}: ${(err as Error).message}`);
      }

      await sleep(CRAWL_SLEEP_MS);
    }

    if (pagePosts.length > 0) {
      await upsertPosts(pagePosts);
    }
  }

  console.log(`Hoàn thành cào creator ${user.nickname}. Tổng số video đã xử lý thành công: ${crawlCount}`);
}

/**
 * # Cào danh sách video từ Douyin theo từ khóa và lưu vào Supabase + R2
 */
export async function crawlSearch(keyword: string, maxCount = 20): Promise<void> {
  let page = 0;
  let searchId = "";
  let collected = 0;
  const limit = 10;

  console.log(`Bắt đầu cào tìm kiếm với từ khóa: "${keyword}", giới hạn tối đa: ${maxCount}`);

  while (collected < maxCount) {
    const offset = page * limit;
    const referer = encodeURI(`https://www.douyin.com/search/${keyword}?aid=f594bbd9-a0e2-4651-9319-ebe3cb6298c1&type=general`);
    const res = await douyinGet("/aweme/v1/web/general/search/single/", {
      search_channel: "aweme_general",
      enable_history: "1",
      keyword: keyword,
      search_source: "tab_search",
      query_correct_type: "1",
      is_filter_search: "0",
      from_group_id: "7378810571505847586",
      offset: String(offset),
      count: "15",
      need_filter_settings: "1",
      list_type: "multi",
      search_id: searchId,
    }, { sign: false, referer });

    const data = res.data ?? [];
    console.log(`Lấy được trang kết quả tìm kiếm thứ ${page + 1} với ${data.length} phần tử.`);

    if (data.length === 0) {
      break;
    }

    searchId = res.extra?.logid ?? "";

    const pagePosts: CrawledPostRow[] = [];
    for (const item of data) {
      if (collected >= maxCount) {
        break;
      }

      const info = item.aweme_info ?? item.aweme_mix_info?.mix_items?.[0];
      if (!info?.aweme_id) {
        continue;
      }

      console.log(`Đang xử lý video tìm kiếm thứ ${collected + 1}: ${info.aweme_id} - ${info.desc || "Không tiêu đề"}`);

      try {
        console.log(`Tiến hành tải chi tiết video ${info.aweme_id} từ endpoint detail...`);
        const detailRes = await douyinGet("/aweme/v1/web/aweme/detail/", { aweme_id: info.aweme_id });
        const detail = validateAwemeDetail(detailRes.aweme_detail);

        const postRow = await persistAweme(detail, { skipDbWrite: true });
        pagePosts.push(postRow);
        collected++;
      } catch (err) {
        console.log(`Lỗi khi xử lý video tìm kiếm ${info.aweme_id}: ${(err as Error).message}`);
      }

      await sleep(CRAWL_SLEEP_MS);
    }

    if (pagePosts.length > 0) {
      await upsertPosts(pagePosts);
    }

    page++;
    await sleep(CRAWL_SLEEP_MS);
  }

  console.log(`Hoàn thành cào tìm kiếm từ khóa "${keyword}". Tổng số video đã xử lý: ${collected}`);
}

/**
 * # Cào bình luận của video từ Douyin và lưu vào Supabase
 */
export async function crawlComments(
  awemeId: string,
  options: { maxCount?: number; withReplies?: boolean } = {}
): Promise<void> {
  const maxCount = options.maxCount ?? 50;
  const withReplies = options.withReplies ?? false;

  console.log(`Bắt đầu cào bình luận cho video: ${awemeId}, giới hạn tối đa: ${maxCount}`);

  const postUuid = await getPostUuid("douyin", awemeId);
  const referer = encodeURI(`https://www.douyin.com/search/抖音?aid=3a3cec5a-9e27-4040-b6aa-ef548c2c1138&publish_time=0&sort_type=0&source=search_history&type=general`);

  const collected: any[] = [];
  let commentsHasMore = true;
  let commentsCursor = 0;

  while (commentsHasMore && collected.length < maxCount) {
    const commentsRes = await douyinGet(
      "/aweme/v1/web/comment/list/",
      {
        aweme_id: awemeId,
        cursor: String(commentsCursor),
        count: "20",
        item_type: "0",
      },
      { referer }
    );

    commentsHasMore = commentsRes.has_more === 1 || commentsRes.has_more === true;
    commentsCursor = commentsRes.cursor ?? 0;
    const comments = commentsRes.comments ?? [];

    if (comments.length === 0) {
      break;
    }

    const primaryComments = comments.slice(0, maxCount - collected.length);
    const mappedPrimary = primaryComments.map((c: any) => mapComment(c, awemeId, postUuid));
    await upsertComments(mappedPrimary);

    for (const c of primaryComments) {
      collected.push(c);
    }

    if (withReplies) {
      for (const comment of primaryComments) {
        const replyCommentTotal = comment.reply_comment_total ?? 0;
        if (replyCommentTotal > 0) {
          const commentId = comment.cid;
          let subCommentsHasMore = true;
          let subCommentsCursor = 0;
          const subCollected: any[] = [];

          while (subCommentsHasMore) {
            const subCommentsRes = await douyinGet(
              "/aweme/v1/web/comment/list/reply/",
              {
                comment_id: commentId,
                cursor: String(subCommentsCursor),
                count: "20",
                item_type: "0",
                item_id: awemeId,
              },
              { referer }
            );

            subCommentsHasMore = subCommentsRes.has_more === 1 || subCommentsRes.has_more === true;
            subCommentsCursor = subCommentsRes.cursor ?? 0;
            const subComments = subCommentsRes.comments ?? [];

            if (subComments.length === 0) {
              break;
            }

            const mappedSub = subComments.map((sc: any) => mapComment(sc, awemeId, postUuid, commentId));
            await upsertComments(mappedSub);

            for (const sc of subComments) {
              subCollected.push(sc);
            }

            await sleep(CRAWL_SLEEP_MS);
          }
        }
      }
    }

    await sleep(CRAWL_SLEEP_MS);
  }

  console.log(`Hoàn thành cào bình luận cho video ${awemeId}. Tổng số bình luận cấp 1 đã xử lý: ${collected.length}`);
}

/**
 * # Chuyển đổi dữ liệu bình luận gốc sang cấu trúc database
 */
function mapComment(c: any, awemeId: string, postUuid?: string, parentCid?: string) {
  return {
    platform: "douyin",
    platform_cid: c.cid,
    post_id: postUuid,
    platform_post_id: awemeId,
    parent_cid: parentCid,
    author_uid: c.user?.sec_uid || "",
    author_nickname: c.user?.nickname || "",
    content: c.text || "",
    like_count: c.digg_count || 0,
    raw: c,
    published_at: c.create_time ? new Date(c.create_time * 1000).toISOString() : undefined,
  };
}

/**
 * # Lớp Crawler dành riêng cho nền tảng Douyin triển khai giao diện ICrawler
 */
export class DouyinCrawler implements ICrawler {
  /**
   * # Thực hiện cào chi tiết video Douyin
   */
  async crawl(target: string): Promise<void> {
    try {
      await ensureLogin();
      await crawlVideo(target);
      if (currentAccountId) {
        await checkinAccount(currentAccountId, true);
      }
    } catch (err) {
      if (currentAccountId) {
        await checkinAccount(currentAccountId, false);
      }
      throw err;
    }
  }

  /**
   * # Thực hiện cào profile creator và video của họ trên Douyin
   */
  async creator(target: string): Promise<void> {
    try {
      await ensureLogin();
      await crawlCreator(target);
      if (currentAccountId) {
        await checkinAccount(currentAccountId, true);
      }
    } catch (err) {
      if (currentAccountId) {
        await checkinAccount(currentAccountId, false);
      }
      throw err;
    }
  }

  /**
   * # Tìm kiếm video Douyin theo từ khóa
   */
  async search(keyword: string, maxCount?: number): Promise<void> {
    try {
      await ensureLogin();
      await crawlSearch(keyword, maxCount);
      if (currentAccountId) {
        await checkinAccount(currentAccountId, true);
      }
    } catch (err) {
      if (currentAccountId) {
        await checkinAccount(currentAccountId, false);
      }
      throw err;
    }
  }

  /**
   * # Cào bình luận của video Douyin
   */
  async comments(target: string, maxCount?: number): Promise<void> {
    try {
      await ensureLogin();
      await crawlComments(target, { maxCount, withReplies: false });
      if (currentAccountId) {
        await checkinAccount(currentAccountId, true);
      }
    } catch (err) {
      if (currentAccountId) {
        await checkinAccount(currentAccountId, false);
      }
      throw err;
    }
  }

  /**
   * # Khởi chạy trình duyệt cho Douyin
   */
  async launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext> {
    throw new Error("Không dùng: launchBrowser trực tiếp trên DouyinCrawler");
  }
}
