/**
 * # Crawler chính cho Bilibili — orchestrator điều phối search, detail, creator
 */

import { bilibiliGet, downloadMedia, pong, setBilibiliCookie } from "./client.js";
import { uploadMediaToR2, checkMediaExistsInR2 } from "../../store/r2_uploader.js";
import { upsertAuthor, upsertPost, upsertPosts, getPostUuid, upsertComments, checkoutAccount, checkinAccount } from "../../store/index.js";
import { CrawledPostRow } from "../../model/storage.js";
import type { ICrawler, BrowserLaunchOptions } from "../../base/base_crawler.js";
import type { BrowserContext } from "playwright-core";

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

let currentAccountId: string | null = null;

/**
 * # Đảm bảo trạng thái đăng nhập hợp lệ trước khi cào
 */
async function ensureLogin(): Promise<void> {
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    const account = await checkoutAccount("bilibili");
    if (!account) {
      break;
    }
    console.log(`Đang kiểm tra tài khoản từ pool: ${account.username} (ID: ${account.id})...`);
    setBilibiliCookie(account.cookie_data);
    const isActive = await pong();
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
  console.log("Không có tài khoản hoạt động nào từ Pool DB. Đang thử bằng cookie cục bộ/môi trường...");
  setBilibiliCookie("");
  const localIsActive = await pong();
  if (localIsActive) {
    console.log("Cookie cục bộ/môi trường hoạt động tốt.");
    currentAccountId = null;
    return;
  }
  console.log("Cookie cục bộ hết hạn hoặc chưa đăng nhập. Tiến hành khởi chạy trình duyệt để thực hiện đăng nhập...");
  const { getBrowserContext, saveBilibiliCookie, closeBrowser } = await import("./client.js");
  const { BilibiliLogin } = await import("./login.js");
  try {
    const context = await getBrowserContext();
    const login = new BilibiliLogin({
      cookieStr: process.env.BILIBILI_COOKIE,
    });
    const result = await login.begin(context);
    if (!result.success) {
      console.log(`Đăng nhập không thành công: ${result.errorMessage}. Chuyển sang chế độ ẩn danh (Guest)...`);
    } else {
      const cookieStr = result.cookies.map(c => `${c.name}=${c.value}`).join("; ");
      await saveBilibiliCookie(cookieStr);
      console.log("Đăng nhập thành công. Đã cập nhật và lưu cookie mới.");
    }
  } catch (err) {
    console.log(`Không thể hoàn thành đăng nhập: ${(err as Error).message}. Tiếp tục bằng chế độ ẩn danh (Guest)...`);
  } finally {
    await closeBrowser();
  }
}

/**
 * # Phân tách ID video từ link hoặc mã BV
 */
export function parseVideoInfoFromUrl(url: string): string {
  if (url.startsWith("BV")) {
    return url;
  }
  const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
  if (match) {
    return match[1];
  }
  throw new Error("Không thể trích xuất mã BV từ link video");
}

/**
 * # Phân tách ID tác giả từ link hoặc mã số UID
 */
export function parseCreatorInfoFromUrl(url: string): string {
  if (/^\d+$/.test(url)) {
    return url;
  }
  const match = url.match(/space\.bilibili\.com\/(\d+)/);
  if (match) {
    return match[1];
  }
  throw new Error("Không thể trích xuất UID từ link kênh");
}

/**
 * # Chuyển đổi dữ liệu bình luận gốc sang cấu trúc database
 */
function mapBilibiliComment(c: any, bvid: string, postUuid?: string, parentCid?: string) {
  return {
    platform: "bilibili",
    platform_cid: String(c.rpid),
    post_id: postUuid,
    platform_post_id: bvid,
    parent_cid: parentCid ? String(parentCid) : undefined,
    author_uid: String(c.member?.mid || c.mid || ""),
    author_nickname: c.member?.uname || "",
    content: c.content?.message || "",
    like_count: c.like || 0,
    raw: c,
    published_at: c.ctime ? new Date(c.ctime * 1000).toISOString() : undefined,
  };
}

/**
 * # Lưu thông tin tác giả và bài đăng chi tiết của Bilibili vào Supabase + upload R2
 */
export async function persistBilibiliVideo(
  detailRes: any,
  options?: { authorUuid?: string; skipDbWrite?: boolean }
): Promise<CrawledPostRow> {
  const view = detailRes.View;
  if (!view) {
    throw new Error("Phản hồi chi tiết video không có trường View");
  }

  const bvid = view.bvid;
  const owner = view.owner || {};

  let avatarUrlR2 = "";
  const faceUrl = owner.face;
  if (faceUrl) {
    try {
      const midStr = String(owner.mid);
      const exists = await checkMediaExistsInR2("bilibili", midStr, "avatar.jpg");
      if (exists) {
        avatarUrlR2 = `bilibili/${midStr}/avatar.jpg`;
      } else {
        const avatarBuf = await downloadMedia(faceUrl);
        avatarUrlR2 = await uploadMediaToR2("bilibili", midStr, "avatar.jpg", avatarBuf, "image/jpeg");
      }
    } catch {}
  }

  let authorUuid = options?.authorUuid;
  if (!authorUuid) {
    authorUuid = await upsertAuthor({
      platform: "bilibili",
      platform_uid: String(owner.mid || "unknown"),
      nickname: owner.name || "Người dùng Bilibili",
      avatar_url: avatarUrlR2 || undefined,
      raw: owner,
    });
  }

  const mediaUrlsR2: string[] = [];
  let coverUrlR2 = "";

  const picUrl = view.pic;
  if (picUrl) {
    try {
      const exists = await checkMediaExistsInR2("bilibili", bvid, "cover.jpg");
      if (exists) {
        coverUrlR2 = `bilibili/${bvid}/cover.jpg`;
      } else {
        const coverBuf = await downloadMedia(picUrl);
        coverUrlR2 = await uploadMediaToR2("bilibili", bvid, "cover.jpg", coverBuf, "image/jpeg");
      }
    } catch {}
  }

  if (process.env.ENABLE_GET_MEIDAS === "true") {
    const cid = view.cid;
    const aid = view.aid;
    if (cid && aid) {
      try {
        const exists = await checkMediaExistsInR2("bilibili", bvid, "video.mp4");
        if (exists) {
          mediaUrlsR2.push(`bilibili/${bvid}/video.mp4`);
        } else {
          const playUrlRes = await bilibiliGet("/x/player/wbi/playurl", {
            avid: aid,
            cid: cid,
            qn: 80,
            fourk: 1,
            fnval: 1,
            platform: "pc"
          }, true);
          const durl = playUrlRes.durl;
          let maxUrl = "";
          let maxSize = -1;
          if (durl && Array.isArray(durl)) {
            for (const item of durl) {
              if (item.size > maxSize) {
                maxSize = item.size;
                maxUrl = item.url;
              }
            }
          }
          if (maxUrl) {
            const videoBuf = await downloadMedia(maxUrl);
            const videoKey = await uploadMediaToR2("bilibili", bvid, "video.mp4", videoBuf, "video/mp4");
            mediaUrlsR2.push(videoKey);
          }
        }
      } catch (err) {
        console.log(`Lỗi tải video Bilibili: ${(err as Error).message}`);
      }
    }
  }

  const publishedAt = view.pubdate ? new Date(view.pubdate * 1000).toISOString() : new Date().toISOString();
  const stat = view.stat || {};

  const postData: CrawledPostRow = {
    platform: "bilibili",
    platform_id: bvid,
    author_id: authorUuid,
    caption: view.desc || view.title || "",
    media_urls: mediaUrlsR2,
    cover_url: coverUrlR2 || undefined,
    stats: {
      digg_count: stat.like ?? 0,
      comment_count: stat.reply ?? 0,
      share_count: stat.share ?? 0,
      play_count: stat.view ?? 0,
    },
    raw: detailRes,
    published_at: publishedAt,
  };

  if (!options?.skipDbWrite) {
    await upsertPost(postData);
  }

  return postData;
}

/**
 * # Cào bình luận của video Bilibili và lưu vào Supabase
 */
export async function crawlComments(
  bvidOrAid: string,
  options: { maxCount?: number; withReplies?: boolean } = {}
): Promise<void> {
  const maxCount = options.maxCount ?? 50;
  const withReplies = options.withReplies ?? false;

  let aid = "";
  let bvid = "";
  if (bvidOrAid.startsWith("BV")) {
    bvid = bvidOrAid;
  }
  
  const detailRes = await bilibiliGet("/x/web-interface/view/detail", bvid ? { bvid } : { aid: bvidOrAid }, false);
  const view = detailRes.View;
  if (!view) {
    throw new Error("Không thể lấy thông tin video để cào bình luận");
  }
  aid = String(view.aid);
  bvid = view.bvid;

  const postUuid = await getPostUuid("bilibili", bvid);

  const collected: any[] = [];
  let commentsHasMore = true;
  let nextCursor = 0;

  while (commentsHasMore && collected.length < maxCount) {
    const commentsRes = await bilibiliGet(
      "/x/v2/reply/wbi/main",
      {
        oid: aid,
        mode: "3",
        type: "1",
        ps: "20",
        next: String(nextCursor),
      },
      true
    );

    const cursor = commentsRes.cursor || {};
    commentsHasMore = cursor.is_end === false;
    nextCursor = cursor.next ?? 0;

    const replies = commentsRes.replies ?? [];
    if (replies.length === 0) {
      break;
    }

    const primaryComments = replies.slice(0, maxCount - collected.length);
    const mappedPrimary = primaryComments.map((c: any) => mapBilibiliComment(c, bvid, postUuid));
    await upsertComments(mappedPrimary);

    for (const c of primaryComments) {
      collected.push(c);
    }

    if (withReplies) {
      for (const comment of primaryComments) {
        const rcount = comment.rcount ?? 0;
        if (rcount > 0) {
          const rootId = comment.rpid;
          let subPn = 1;
          let subHasMore = true;

          while (subHasMore) {
            const subRes = await bilibiliGet(
              "/x/v2/reply/reply",
              {
                oid: aid,
                type: "1",
                root: String(rootId),
                pn: String(subPn),
                ps: "20",
              },
              false
            );

            const subReplies = subRes.replies ?? [];
            if (subReplies.length === 0) {
              break;
            }

            const mappedSub = subReplies.map((sc: any) => mapBilibiliComment(sc, bvid, postUuid, rootId));
            await upsertComments(mappedSub);

            const count = subRes.page?.count ?? 0;
            subHasMore = count > subPn * 20;
            subPn++;

            await sleep(1000);
          }
        }
      }
    }

    await sleep(1000);
  }
}

/**
 * # Cào toàn bộ video từ một creator và lưu vào DB + R2
 */
export async function crawlCreator(urlOrUid: string): Promise<void> {
  const creatorId = parseCreatorInfoFromUrl(urlOrUid);

  console.log(`Bắt đầu cào thông tin creator cho UID: ${creatorId}`);
  const creatorInfoRes = await bilibiliGet("/x/space/wbi/acc/info", { mid: creatorId }, true);

  const nickname = creatorInfoRes.name || "Người dùng Bilibili";
  const faceUrl = creatorInfoRes.face;

  let avatarUrlR2 = "";
  if (faceUrl) {
    try {
      const exists = await checkMediaExistsInR2("bilibili", creatorId, "avatar.jpg");
      if (exists) {
        avatarUrlR2 = `bilibili/${creatorId}/avatar.jpg`;
      } else {
        const avatarBuf = await downloadMedia(faceUrl);
        avatarUrlR2 = await uploadMediaToR2("bilibili", creatorId, "avatar.jpg", avatarBuf, "image/jpeg");
      }
    } catch (err) {
      console.log(`Lỗi tải avatar creator: ${(err as Error).message}`);
    }
  }

  const authorUuid = await upsertAuthor({
    platform: "bilibili",
    platform_uid: creatorId,
    nickname,
    avatar_url: avatarUrlR2 || undefined,
    description: creatorInfoRes.sign || undefined,
    raw: creatorInfoRes,
  });

  const maxPosts = process.env.CREATOR_MAX_POSTS ? parseInt(process.env.CREATOR_MAX_POSTS, 10) : Infinity;
  let pn = 1;
  const ps = 30;
  let crawlCount = 0;

  console.log(`Bắt đầu cào danh sách video của creator, giới hạn tối đa: ${maxPosts}`);

  while (crawlCount < maxPosts) {
    const searchRes = await bilibiliGet("/x/space/wbi/arc/search", {
      mid: creatorId,
      pn: String(pn),
      ps: String(ps),
      order: "pubdate"
    }, true);

    const list = searchRes.list || {};
    const vlist = list.vlist || [];
    if (vlist.length === 0) {
      break;
    }

    const pagePosts: CrawledPostRow[] = [];
    for (const item of vlist) {
      if (crawlCount >= maxPosts) {
        break;
      }

      console.log(`Đang xử lý video thứ ${crawlCount + 1}: ${item.bvid} - ${item.title || "Không tiêu đề"}`);

      try {
        const detailRes = await bilibiliGet("/x/web-interface/view/detail", { bvid: item.bvid }, false);
        const postRow = await persistBilibiliVideo(detailRes, { authorUuid, skipDbWrite: true });
        pagePosts.push(postRow);
        crawlCount++;
      } catch (err) {
        console.log(`Lỗi khi xử lý video ${item.bvid}: ${(err as Error).message}`);
      }

      await sleep(1000);
    }

    if (pagePosts.length > 0) {
      await upsertPosts(pagePosts);
      for (const post of pagePosts) {
        if (process.env.ENABLE_GET_COMMENTS !== "false") {
          try {
            await crawlComments(post.platform_id, {
              maxCount: process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10) : 50,
              withReplies: process.env.ENABLE_GET_SUB_COMMENTS === "true"
            });
          } catch (err) {
            console.log(`Lỗi khi cào bình luận cho video ${post.platform_id}: ${(err as Error).message}`);
          }
        }
      }
    }

    const count = searchRes.page?.count ?? 0;
    if (count <= pn * ps) {
      break;
    }
    pn++;
    await sleep(1000);
  }

  console.log(`Hoàn thành cào creator ${nickname}. Tổng số video đã xử lý: ${crawlCount}`);
}

/**
 * # Cào danh sách video từ Bilibili theo từ khóa và lưu vào Supabase + R2
 */
export async function crawlSearch(keyword: string, maxCount = 20): Promise<void> {
  let page = 1;
  const limit = 20;
  let collected = 0;

  console.log(`Bắt đầu cào tìm kiếm với từ khóa: "${keyword}", giới hạn tối đa: ${maxCount}`);

  while (collected < maxCount) {
    const res = await bilibiliGet(
      "/x/web-interface/wbi/search/type",
      {
        search_type: "video",
        keyword: keyword,
        page: String(page),
        page_size: String(limit),
        order: "totalrank",
      },
      true
    );

    const resultList = res.result || [];
    console.log(`Lấy được trang kết quả tìm kiếm thứ ${page} với ${resultList.length} phần tử.`);

    if (resultList.length === 0) {
      break;
    }

    const pagePosts: CrawledPostRow[] = [];
    for (const item of resultList) {
      if (collected >= maxCount) {
        break;
      }

      console.log(`Đang xử lý video tìm kiếm thứ ${collected + 1}: ${item.bvid} - ${item.title || "Không tiêu đề"}`);

      try {
        const detailRes = await bilibiliGet("/x/web-interface/view/detail", { bvid: item.bvid }, false);
        const postRow = await persistBilibiliVideo(detailRes, { skipDbWrite: true });
        pagePosts.push(postRow);
        collected++;
      } catch (err) {
        console.log(`Lỗi khi xử lý video tìm kiếm ${item.bvid}: ${(err as Error).message}`);
      }

      await sleep(1000);
    }

    if (pagePosts.length > 0) {
      await upsertPosts(pagePosts);
      for (const post of pagePosts) {
        if (process.env.ENABLE_GET_COMMENTS !== "false") {
          try {
            await crawlComments(post.platform_id, {
              maxCount: process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10) : 50,
              withReplies: process.env.ENABLE_GET_SUB_COMMENTS === "true"
            });
          } catch (err) {
            console.log(`Lỗi khi cào bình luận cho video ${post.platform_id}: ${(err as Error).message}`);
          }
        }
      }
    }

    page++;
    await sleep(1000);
  }

  console.log(`Hoàn thành cào tìm kiếm từ khóa "${keyword}". Tổng số video đã xử lý: ${collected}`);
}

export class BilibiliCrawler implements ICrawler {
  /**
   * # Thực hiện cào chi tiết video/bài đăng Bilibili
   */
  async crawl(target: string): Promise<void> {
    try {
      await ensureLogin();
      const bvid = parseVideoInfoFromUrl(target);
      const detailRes = await bilibiliGet("/x/web-interface/view/detail", { bvid }, false);
      const post = await persistBilibiliVideo(detailRes);
      if (process.env.ENABLE_GET_COMMENTS !== "false") {
        try {
          await crawlComments(post.platform_id, {
            maxCount: process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES ? parseInt(process.env.CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES, 10) : 50,
            withReplies: process.env.ENABLE_GET_SUB_COMMENTS === "true"
          });
        } catch (err) {
          console.log(`Lỗi khi cào bình luận cho video ${post.platform_id}: ${(err as Error).message}`);
        }
      }
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
   * # Thực hiện cào profile creator và video của họ trên Bilibili
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
   * # Tìm kiếm video Bilibili theo từ khóa
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
   * # Cào bình luận của video Bilibili
   */
  async comments(target: string, maxCount?: number): Promise<void> {
    try {
      await ensureLogin();
      await crawlComments(target, { maxCount, withReplies: process.env.ENABLE_GET_SUB_COMMENTS === "true" });
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
   * # Khởi chạy trình duyệt cho Bilibili
   */
  async launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext> {
    throw new Error("Không dùng: launchBrowser trực tiếp trên BilibiliCrawler");
  }
}
