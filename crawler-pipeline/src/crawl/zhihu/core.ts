/**
 * # Crawler chính cho Zhihu (知乎) — điều phối search, detail, creator, comments
 */

import { ZhihuClient, downloadMedia, getRelativeUri } from "./client.js";
import {
  upsertAuthor,
  upsertPost,
  upsertPosts,
  getPostUuid,
  upsertComments,
  checkoutAccount,
  checkinAccount,
  updateTaskProgress,
} from "../../store/index.js";
import { CrawledPostRow } from "../../model/storage.js";
import type { ICrawler, BrowserLaunchOptions } from "../../base/base_crawler.js";
import type { BrowserContext, Page } from "playwright-core";
import { stripHtml, parseCookieString } from "../../utils/crawler.js";
import { CONFIG } from "../../config.js";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const ANSWERS_INCLUDE = "data[*].is_normal,admin_closed_comment,reward_info,is_collapsed,annotation_action,annotation_detail,collapse_reason,collapsed_by,suggest_edit,comment_count,can_comment,content,editable_content,attachment,voteup_count,reshipment_settings,comment_permission,created_time,updated_time,review_info,excerpt,paid_info,reaction_instruction,is_labeled,label_info,relationship.is_authorized,voting,is_author,is_thanked,is_nothelp;data[*].vessay_info;data[*].author.badge[?(type=best_answerer)].topics;data[*].author.vip_info;data[*].question.has_publishing_draft,relationship";
const ARTICLES_INCLUDE = "data[*].comment_count,suggest_edit,is_normal,thumbnail_extra_info,thumbnail,can_comment,comment_permission,admin_closed_comment,content,voteup_count,created,updated,upvoted_followees,voting,review_info,reaction_instruction,is_labeled,label_info;data[*].vessay_info;data[*].author.badge[?(type=best_answerer)].topics;data[*].author.vip_info;";
const VIDEOS_INCLUDE = "similar_zvideo,creation_relationship,reaction_instruction";

/**
 * # Dừng luồng thực thi trong khoảng thời gian chỉ định
 */
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * # Phân tích và trích xuất loại thực thể từ URL Zhihu
 */
export function parseZhihuUrl(url: string): { type: "answer" | "article" | "zvideo" | "people" | ""; id: string; questionId?: string } {
  if (url.includes("/answer/")) {
    const match = url.match(/\/question\/(\d+)\/answer\/(\d+)/);
    if (match) {
      return { type: "answer", id: match[2], questionId: match[1] };
    }
  } else if (url.includes("/p/")) {
    const match = url.match(/\/p\/(\d+)/);
    if (match) {
      return { type: "article", id: match[1] };
    }
  } else if (url.includes("/zvideo/")) {
    const match = url.match(/\/zvideo\/([a-zA-Z0-9_]+)/);
    if (match) {
      return { type: "zvideo", id: match[1] };
    }
  } else if (url.includes("/people/")) {
    const match = url.match(/\/people\/([^/?#]+)/);
    if (match) {
      return { type: "people", id: match[1] };
    }
  }
  return { type: "", id: "" };
}

/**
 * # Ánh xạ dữ liệu bình luận gốc của Zhihu sang cấu trúc database
 */
function mapZhihuComment(c: any, platformPostId: string, postUuid?: string, parentCid?: string) {
  let ipLocation = "";
  const commentTags = c.comment_tag || [];
  for (const tag of commentTags) {
    if (tag.type === "ip_info") {
      ipLocation = tag.text || "";
      break;
    }
  }

  const author = c.author || {};
  const authorMember = author.member || author;

  return {
    platform: "zhihu",
    platform_cid: String(c.id),
    post_id: postUuid,
    platform_post_id: platformPostId,
    parent_cid: parentCid ? String(parentCid) : (c.reply_comment_id ? String(c.reply_comment_id) : undefined),
    author_uid: String(authorMember.url_token || authorMember.id || ""),
    author_nickname: authorMember.name || "",
    content: stripHtml(c.content || ""),
    like_count: c.like_count || 0,
    raw: c,
    published_at: c.created_time ? new Date(c.created_time * 1000).toISOString() : undefined,
  };
}

/**
 * # Cào chi tiết bài đăng/câu trả lời/zvideo của Zhihu từ trang HTML chi tiết
 */
export async function crawlDetail(
  url: string,
  options?: { authorUuid?: string; skipDbWrite?: boolean }
): Promise<CrawledPostRow | null> {
  const { type, id } = parseZhihuUrl(url);
  if (!type || !id) {
    throw new Error(`URL không hợp lệ: ${url}`);
  }

  const zhihuClient = new ZhihuClient();
  const html = await zhihuClient.request("GET", url, { sign: false, headers: { "Accept": "text/html" } });

  const match = html.match(/<script id="js-initialData"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error(`Không tìm thấy js-initialData trong HTML trang chi tiết`);
  }

  const jsonData = JSON.parse(match[1]);
  const entities = jsonData.initialState?.entities || {};
  let contentObj: any = null;

  if (type === "answer") {
    contentObj = entities.answers?.[id];
  } else if (type === "article") {
    contentObj = entities.articles?.[id];
  } else if (type === "zvideo") {
    contentObj = entities.zvideos?.[id];
  }

  if (!contentObj) {
    throw new Error(`Không tìm thấy thông tin thực thể ${type} với ID ${id} trong js-initialData`);
  }

  let author = contentObj.author || {};
  if (typeof author === "string") {
    author = entities.users?.[author] || {};
  }
  const authorMember = author.member || author;

  const platformUid = String(authorMember.urlToken || authorMember.url_token || authorMember.id || "unknown");
  const nickname = authorMember.name || "Người dùng Zhihu";

  let authorUuid = options?.authorUuid;
  if (!authorUuid) {
    authorUuid = await upsertAuthor({
      platform: "zhihu",
      platform_uid: platformUid,
      nickname,
      avatar_url: authorMember.avatarUrl || authorMember.avatar_url || undefined,
      gender: authorMember.gender === 1 ? "Male" : (authorMember.gender === 0 ? "Female" : "Unknown"),
      description: authorMember.headline || authorMember.description || undefined,
      raw: authorMember,
    });
  }

  // 1. Xác định media type và URL gốc
  const mediaType = "image";
  const originalCoverUrl = contentObj.thumbnail || contentObj.imageUrl || contentObj.image_url || "";
  const originalMediaUrls: string[] = [];

  // 2. Xử lý R2 cache (removed)
  let coverUrl = originalCoverUrl;
  const mediaUrls: string[] = [...originalMediaUrls];
  
  let mediaSource = "original";
  let mediaStatus = "original_only";
  let mediaError: string | null = null;
  let mediaCachedAt: string | null = null;

  if (!originalCoverUrl) {
    mediaSource = "none";
    mediaStatus = "unavailable";
  }

  const publishedAt = contentObj.createdTime || contentObj.created || Math.floor(Date.now() / 1000);
  const caption = stripHtml(contentObj.content || contentObj.excerpt || contentObj.title || "");

  const postData: CrawledPostRow = {
    platform: "zhihu",
    platform_id: id,
    author_id: authorUuid,
    caption,
    media_urls: mediaUrls,
    cover_url: coverUrl || undefined,
    stats: {
      digg_count: contentObj.voteupCount || contentObj.voteup_count || 0,
      comment_count: contentObj.commentCount || contentObj.comment_count || 0,
      share_count: contentObj.shareCount || 0,
      play_count: contentObj.playCount || 0,
    },
    raw: contentObj,
    published_at: new Date(publishedAt * 1000).toISOString(),
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
 * # Cào bình luận của bài đăng Zhihu và lưu vào database
 */
export async function crawlComments(
  contentId: string,
  contentType: string,
  options: { maxCount?: number; withReplies?: boolean } = {}
): Promise<void> {
  const maxCount = options.maxCount ?? 50;
  const withReplies = options.withReplies ?? false;

  const postUuid = await getPostUuid("zhihu", contentId);
  const zhihuClient = new ZhihuClient();

  const collected: any[] = [];
  let commentsHasMore = true;
  let nextOffset = "";

  while (commentsHasMore && collected.length < maxCount) {
    const commentsRes = await zhihuClient.request(
      "GET",
      `/api/v4/comment_v5/${contentType}s/${contentId}/root_comment?limit=10&offset=${nextOffset}&order=score`
    );

    const paging = commentsRes.paging || {};
    commentsHasMore = paging.is_end === false;

    const nextUrl = paging.next || "";
    if (nextUrl) {
      try {
        const parsedUrl = new URL(nextUrl);
        nextOffset = parsedUrl.searchParams.get("offset") || "";
      } catch {
        nextOffset = "";
      }
    } else {
      nextOffset = "";
    }

    const data = commentsRes.data || [];
    if (data.length === 0) {
      break;
    }

    const primaryComments = data.slice(0, maxCount - collected.length);
    const mappedPrimary = primaryComments.map((c: any) => mapZhihuComment(c, contentId, postUuid));
    await upsertComments(mappedPrimary);

    for (const c of primaryComments) {
      collected.push(c);
    }

    if (withReplies) {
      for (const comment of primaryComments) {
        const childCommentCount = comment.child_comment_count ?? 0;
        if (childCommentCount > 0) {
          const rootId = comment.id;
          let subHasMore = true;
          let subOffset = "";

          while (subHasMore) {
            const subRes = await zhihuClient.request(
              "GET",
              `/api/v4/comment_v5/comment/${rootId}/child_comment?limit=10&offset=${subOffset}&order=sort`
            );

            const subPaging = subRes.paging || {};
            subHasMore = subPaging.is_end === false;

            const subNextUrl = subPaging.next || "";
            if (subNextUrl) {
              try {
                const parsedUrl = new URL(subNextUrl);
                subOffset = parsedUrl.searchParams.get("offset") || "";
              } catch {
                subOffset = "";
              }
            } else {
              subOffset = "";
            }

            const subReplies = subRes.data || [];
            if (subReplies.length === 0) {
              break;
            }

            const mappedSub = subReplies.map((sc: any) => mapZhihuComment(sc, contentId, postUuid, rootId));
            await upsertComments(mappedSub);

            await sleep(1000 + Math.random() * 1000);
          }
        }
      }
    }

    await sleep(1000 + Math.random() * 1000);
  }
}

/**
 * # Cào thông tin creator và toàn bộ bài đăng của creator trên Zhihu
 */
export async function crawlCreator(urlOrToken: string): Promise<void> {
  let urlToken = urlOrToken;
  if (urlOrToken.includes("/people/")) {
    const parsed = parseZhihuUrl(urlOrToken);
    urlToken = parsed.id;
  }

  console.log(`Bắt đầu cào thông tin creator cho token: ${urlToken}`);
  const zhihuClient = new ZhihuClient();
  const profileUrl = `https://www.zhihu.com/people/${urlToken}`;
  const html = await zhihuClient.request("GET", profileUrl, { sign: false, headers: { "Accept": "text/html" } });

  const match = html.match(/<script id="js-initialData"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error(`Không tìm thấy js-initialData trong HTML trang cá nhân`);
  }

  const jsonData = JSON.parse(match[1]);
  const entities = jsonData.initialState?.entities || {};
  const creatorInfo = entities.users?.[urlToken];
  if (!creatorInfo) {
    throw new Error(`Không tìm thấy thông tin creator ${urlToken} trong js-initialData`);
  }

  const authorUuid = await upsertAuthor({
    platform: "zhihu",
    platform_uid: urlToken,
    nickname: creatorInfo.name || "Người dùng Zhihu",
    avatar_url: creatorInfo.avatarUrl || creatorInfo.avatar_url || undefined,
    gender: creatorInfo.gender === 1 ? "Male" : (creatorInfo.gender === 0 ? "Female" : "Unknown"),
    description: creatorInfo.headline || creatorInfo.description || undefined,
    follows_count: creatorInfo.followingCount || 0,
    fans_count: creatorInfo.followerCount || 0,
    interaction_count: creatorInfo.voteupCount || 0,
    videos_count: creatorInfo.zvideoCount || 0,
    ip_location: creatorInfo.ipInfo || undefined,
    raw: creatorInfo,
  });

  const maxPosts = process.env.CREATOR_MAX_POSTS ? parseInt(process.env.CREATOR_MAX_POSTS, 10) : 20;
  let crawlCount = 0;
  
  const sources = [
    { type: "answer", endpoint: "answers", include: ANSWERS_INCLUDE },
    { type: "article", endpoint: "articles", include: ARTICLES_INCLUDE },
    { type: "zvideo", endpoint: "zvideos", include: VIDEOS_INCLUDE }
  ];

  const pagePosts: CrawledPostRow[] = [];

  for (const source of sources) {
    if (crawlCount >= maxPosts) {
      break;
    }

    let offset = 0;
    const limit = 20;
    let sourceEnd = false;

    console.log(`Bắt đầu cào danh mục ${source.type} của creator`);

    while (crawlCount < maxPosts && !sourceEnd) {
      const url = `/api/v4/members/${urlToken}/${source.endpoint}?include=${encodeURIComponent(source.include)}&offset=${offset}&limit=${limit}&order_by=created`;
      const res = await zhihuClient.request("GET", url);
      const data = res.data || [];
      if (data.length === 0) {
        break;
      }
      
      const paging = res.paging || {};
      sourceEnd = paging.is_end === true;

      for (const item of data) {
        if (crawlCount >= maxPosts) {
          break;
        }

        console.log(`Đang xử lý mục thứ ${crawlCount + 1}: ${item.id}`);

        try {
          let detailUrl = "";
          if (source.type === "answer") {
            detailUrl = `https://www.zhihu.com/question/${item.question?.id}/answer/${item.id}`;
          } else if (source.type === "article") {
            detailUrl = `https://zhuanlan.zhihu.com/p/${item.id}`;
          } else if (source.type === "zvideo") {
            detailUrl = `https://www.zhihu.com/zvideo/${item.id}`;
          }

          if (detailUrl) {
            const postRow = await crawlDetail(detailUrl, { authorUuid, skipDbWrite: true });
            if (postRow) {
              pagePosts.push(postRow);
              crawlCount++;
            }
          }
        } catch (err) {
          console.log(`Lỗi xử lý creator item ${item.id}: ${(err as Error).message}`);
        }

        await sleep(1000 + Math.random() * 1000);
      }

      offset += limit;
      await sleep(1000 + Math.random() * 1000);
    }
  }

    if (pagePosts.length > 0) {
      await upsertPosts(pagePosts);
      for (const post of pagePosts) {
        if (process.env.ENABLE_GET_COMMENTS !== "false") {
          try {
            await crawlComments(post.platform_id, (post.raw as any)?.type || "answer", {
              maxCount: process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10) : 50,
              withReplies: process.env.ENABLE_GET_SUB_COMMENTS === "true"
            });
          } catch (err) {
            console.log(`Lỗi khi cào bình luận cho bài đăng ${post.platform_id}: ${(err as Error).message}`);
          }
        }
      }
    }

  console.log(`Hoàn thành cào creator ${creatorInfo.name}. Tổng số bài đăng đã xử lý: ${crawlCount}`);
}

export async function crawlSearch(keyword: string, maxCount = 20, client?: ZhihuClient): Promise<void> {
  const limit = 20;
  let collected = 0;
  let page = 1;
  const zhihuClient = client || new ZhihuClient();

  console.log(`Bắt đầu cào tìm kiếm Zhihu với từ khóa: "${keyword}", giới hạn: ${maxCount}`);

  // URL khởi điểm chuẩn theo trình duyệt thực tế
  let nextUrl = `/api/v4/search_v3?t=general&q=${encodeURIComponent(keyword)}&correction=1&offset=0&limit=${limit}&search_source=Normal&zhida_source=ai_search_general`;
  const referer = `https://www.zhihu.com/search?q=${encodeURIComponent(keyword)}&type=content`;

  while (collected < maxCount && nextUrl) {
    const searchRes = await zhihuClient.request("GET", nextUrl, { referer });
    const data = searchRes.data || [];
    console.log(`Lấy được trang tìm kiếm thứ ${page} với ${data.length} phần tử.`);

    if (data.length === 0) {
      break;
    }

    const searchResults = data.filter((item: any) => item.type === "search_result" || item.type === "zvideo");
    if (searchResults.length === 0) {
      break;
    }

    const pagePosts: CrawledPostRow[] = [];
    for (const item of searchResults) {
      if (collected >= maxCount) {
        break;
      }

      const obj = item.object;
      if (!obj) {
        continue;
      }

      console.log(`Đang xử lý bài đăng tìm kiếm thứ ${collected + 1}: ${obj.id} - ${obj.title || "Không tiêu đề"}`);

      try {
        // Trích xuất thông tin tác giả trực tiếp từ kết quả tìm kiếm
        let author = obj.author || {};
        const platformUid = String(author.urlToken || author.url_token || author.id || "unknown");
        const nickname = author.name || "Người dùng Zhihu";
        
        const authorUuid = await upsertAuthor({
          platform: "zhihu",
          platform_uid: platformUid,
          nickname,
          avatar_url: author.avatarUrl || author.avatar_url || undefined,
          gender: author.gender === 1 ? "Male" : (author.gender === 0 ? "Female" : "Unknown"),
          description: author.headline || author.description || undefined,
          raw: author,
        });

        const caption = stripHtml(obj.content || obj.excerpt || obj.title || "");
        const originalCoverUrl = obj.thumbnail || obj.imageUrl || obj.image_url || "";
        const publishedAt = obj.createdTime || obj.created || Math.floor(Date.now() / 1000);

        const postData: CrawledPostRow = {
          platform: "zhihu",
          platform_id: String(obj.id),
          author_id: authorUuid,
          caption,
          media_urls: [],
          cover_url: originalCoverUrl || undefined,
          stats: {
            digg_count: obj.voteupCount || obj.voteup_count || 0,
            comment_count: obj.commentCount || obj.comment_count || 0,
            share_count: obj.shareCount || 0,
            play_count: obj.playCount || 0,
          },
          raw: obj,
          published_at: new Date(publishedAt * 1000).toISOString(),
          media_type: "image",
          original_media_urls: [],
          original_cover_url: originalCoverUrl || undefined,
          media_status: originalCoverUrl ? "original_only" : "unavailable",
          media_source: originalCoverUrl ? "original" : "none",
        };

        pagePosts.push(postData);
        collected++;
      } catch (err) {
        console.log(`Lỗi khi trích xuất bài đăng tìm kiếm ${obj.id}: ${(err as Error).message}`);
      }

      await sleep(100 + Math.random() * 100);
    }

    if (pagePosts.length > 0) {
      await upsertPosts(pagePosts);
      // Cập nhật tiến độ task lên Supabase
      if (process.env.CURRENT_TASK_ID) {
        await updateTaskProgress(process.env.CURRENT_TASK_ID, collected, maxCount);
      }
      
      for (const post of pagePosts) {
        if (process.env.ENABLE_GET_COMMENTS !== "false") {
          try {
            await crawlComments(post.platform_id, (post.raw as any)?.type || "answer", {
              maxCount: process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10) : 50,
              withReplies: process.env.ENABLE_GET_SUB_COMMENTS === "true"
            });
          } catch (err) {
            console.log(`Lỗi khi cào bình luận cho bài đăng ${post.platform_id}: ${(err as Error).message}`);
          }
        }
      }
    }

    const paging = searchRes.paging || {};
    if (paging.is_end || !paging.next) {
      console.log("Zhihu báo hết kết quả phân trang.");
      break;
    }
    
    // Gán relative path cho trang tiếp theo
    nextUrl = getRelativeUri(paging.next);
    page++;
    await sleep(1000 + Math.random() * 1000);
  }
}

export class ZhihuCrawler implements ICrawler {
  private client: ZhihuClient;
  private currentAccountId: string | null = null;
  private browserContext: BrowserContext | null = null;
  private browserPage: Page | null = null;

  constructor() {
    this.client = new ZhihuClient();
  }

  async launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext> {
    if (this.browserContext) {
      return this.browserContext;
    }
    const { launchPersistentContext } = await import("cloakbrowser");
    const profileDir = join(process.cwd(), "output", "profiles", "zhihu");

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
      if (["image", "media", "font"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    this.client.setPage(this.browserPage, this.browserContext);
    return this.browserContext;
  }

  async ensureLogin(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 5;

    // 1. Thử lấy tài khoản từ Account Pool trong Database
    while (attempts < maxAttempts) {
      const account = await checkoutAccount("zhihu");
      if (!account) {
        break;
      }
      console.log(`Đang kiểm tra tài khoản Zhihu từ pool: ${account.username} (ID: ${account.id})...`);

      const context = await this.launchBrowser();
      const cookieDict = parseCookieString(account.cookie_data);
      const cookieObjects = [".zhihu.com", "www.zhihu.com"].flatMap(domain =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );
      await context.addCookies(cookieObjects);

      // Kiểm tra d_c0 cookie bắt buộc
      const freshCookies = await context.cookies();
      const hasDC0 = freshCookies.some(c => c.name === "d_c0");
      if (!hasDC0) {
        console.log(`Tài khoản Zhihu ${account.username} thiếu cookie d_c0 bắt buộc! Trả lại pool với đánh dấu lỗi...`);
        await checkinAccount(account.id, false);
        this.currentAccountId = null;
        attempts++;
        continue;
      }

      const isActive = await this.client.pong();
      if (isActive) {
        console.log(`Tài khoản Zhihu ${account.username} hoạt động tốt. Sẵn sàng cào.`);
        this.currentAccountId = account.id;
        await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
        return;
      } else {
        console.log(`Tài khoản Zhihu ${account.username} không hoạt động. Trả lại pool với đánh dấu lỗi...`);
        await checkinAccount(account.id, false);
        this.currentAccountId = null;
        attempts++;
      }
    }

    // 2. Dự phòng: Sử dụng cookie cục bộ từ môi trường hoặc JSON session file
    console.log("Không có tài khoản hoạt động nào từ Pool DB. Đang thử bằng cookie cục bộ...");
    const context = await this.launchBrowser();

    let localCookie = process.env.ZHIHU_COOKIE || "";
    if (!localCookie) {
      try {
        const sessionPath = join(process.cwd(), "output", "zhihu_session.json");
        const content = await readFile(sessionPath, "utf8");
        localCookie = JSON.parse(content).cookie || "";
      } catch {}
    }

    if (localCookie) {
      const cookieDict = parseCookieString(localCookie);
      const cookieObjects = [".zhihu.com", "www.zhihu.com"].flatMap(domain =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );
      await context.addCookies(cookieObjects);

      // Kiểm tra d_c0 cookie cục bộ bắt buộc
      const freshCookies = await context.cookies();
      const hasDC0 = freshCookies.some(c => c.name === "d_c0");
      if (!hasDC0) {
        throw new Error("Không tìm thấy cookie 'd_c0' bắt buộc của Zhihu trong cấu hình cookie cục bộ. Dừng crawl.");
      }
    }

    const localIsActive = await this.client.pong();
    if (localIsActive) {
      console.log("Cookie cục bộ Zhihu hoạt động tốt.");
      this.currentAccountId = null;
      const freshCookies = await context.cookies();
      await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
      return;
    }

    // 3. Tiến hành đăng nhập thủ công bằng cookie mới nạp qua ZhihuLogin
    console.log("Cookie cục bộ hết hạn hoặc chưa đăng nhập. Tiến hành cấu hình qua ZhihuLogin...");
    const { ZhihuLogin } = await import("./login.js");
    try {
      const login = new ZhihuLogin({
        cookieStr: localCookie,
      });
      const result = await login.begin(context);
      if (!result.success) {
        console.log(`Đăng nhập không thành công: ${result.errorMessage}. Chạy chế độ khách (Guest)...`);
      } else {
        const cookieStr = result.cookies.map(c => `${c.name}=${c.value}`).join("; ");
        const sessionPath = join(process.cwd(), "output", "zhihu_session.json");
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
   * # Thực hiện cào chi tiết bài đăng Zhihu
   */
  async crawl(target: string): Promise<void> {
    let success = false;
    try {
      await this.ensureLogin();
      const post = await crawlDetail(target);
      if (post && process.env.ENABLE_GET_COMMENTS !== "false") {
        try {
          await crawlComments(post.platform_id, (post.raw as any)?.type || "answer", {
            maxCount: process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10) : 50,
            withReplies: process.env.ENABLE_GET_SUB_COMMENTS === "true"
          });
        } catch (err) {
          console.log(`Lỗi khi cào bình luận cho bài đăng ${post.platform_id}: ${(err as Error).message}`);
        }
      }
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Thực hiện cào profile creator và bài đăng của họ trên Zhihu
   */
  async creator(target: string): Promise<void> {
    let success = false;
    try {
      await this.ensureLogin();
      await crawlCreator(target);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Tìm kiếm bài đăng Zhihu theo từ khóa
   */
  async search(keyword: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      await this.ensureLogin();

      // Mở trang search thật trên trình duyệt để warm up cookie
      if (this.browserPage && this.browserContext) {
        const searchUrl = `https://www.zhihu.com/search?q=${encodeURIComponent(keyword)}&type=content`;
        console.log(`Đang mở trang search thật trên trình duyệt để warm up cookie: ${searchUrl}`);
        
        await this.browserPage.goto(searchUrl, { waitUntil: "networkidle" });
        console.log("Đang chờ 5 giây để warm up cookie...");
        await sleep(5000);

        // Cập nhật lại cookies mới nhất từ browser context vào client
        const freshCookies = await this.browserContext.cookies();
        await this.client.updateCookies(freshCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
      }

      await crawlSearch(keyword, maxCount, this.client);
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }

  /**
   * # Cào bình luận của bài đăng Zhihu
   */
  async comments(target: string, maxCount?: number): Promise<void> {
    let success = false;
    try {
      await this.ensureLogin();
      const { type, id } = parseZhihuUrl(target);
      if (!type || !id) {
        throw new Error(`URL không hợp lệ: ${target}`);
      }
      await crawlComments(id, type, { maxCount, withReplies: process.env.ENABLE_GET_SUB_COMMENTS === "true" });
      success = true;
    } finally {
      await this.releaseAccount(success);
    }
  }
}
