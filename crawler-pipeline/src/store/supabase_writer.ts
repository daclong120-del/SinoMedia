import { CONFIG } from "../config.js";
import { ProxyAgent } from "undici";
import { CrawledAuthorRow, CrawledPostRow, CrawledCommentRow } from "../model/storage.js";

let dispatcher: ProxyAgent | undefined;
if (CONFIG.proxy) {
  dispatcher = new ProxyAgent(CONFIG.proxy);
}

/**
 * # Thực hiện gửi HTTP request đến Supabase PostgREST API dùng service_role key
 */
async function supabaseRest(path: string, options: { method?: string; body?: any; params?: Record<string, string> } = {}): Promise<any> {
  const urlObj = new URL(`${CONFIG.supabase.url}/rest/v1/${path}`);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      urlObj.searchParams.append(key, value);
    }
  }

  const headers: Record<string, string> = {
    "apikey": CONFIG.supabase.serviceRoleKey,
    "Authorization": `Bearer ${CONFIG.supabase.serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  if (options.method && ["POST", "PUT", "PATCH"].includes(options.method)) {
    headers["Prefer"] = "return=representation,resolution=merge-duplicates";
  }

  const fetchOptions: any = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  if (dispatcher) {
    fetchOptions.dispatcher = dispatcher;
  }

  const res = await fetch(urlObj.toString(), fetchOptions);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase REST error ${res.status}: ${errText}`);
  }

  return res.json();
}

/**
 * # Thêm mới hoặc cập nhật thông tin tác giả và trả về UUID tương ứng
 */
export async function upsertAuthor(author: CrawledAuthorRow): Promise<string> {
  const result = await supabaseRest("crawled_authors", {
    method: "POST",
    params: { on_conflict: "platform,platform_uid" },
    body: {
      platform: author.platform,
      platform_uid: author.platform_uid,
      nickname: author.nickname,
      avatar_url: author.avatar_url,
      gender: author.gender,
      description: author.description,
      follows_count: author.follows_count,
      fans_count: author.fans_count,
      interaction_count: author.interaction_count,
      videos_count: author.videos_count,
      ip_location: author.ip_location,
      raw: author.raw,
      updated_at: new Date().toISOString(),
    },
  });

  if (!result || result.length === 0) {
    throw new Error("Không thể lưu thông tin tác giả vào Supabase");
  }

  return result[0].id;
}

/**
 * # Thêm mới hoặc cập nhật thông tin bài đăng/video
 */
export async function upsertPost(post: CrawledPostRow): Promise<void> {
  await supabaseRest("crawled_posts", {
    method: "POST",
    params: { on_conflict: "platform,platform_id" },
    body: {
      platform: post.platform,
      platform_id: post.platform_id,
      author_id: post.author_id,
      caption: post.caption,
      media_urls: post.media_urls || [],
      cover_url: post.cover_url,
      stats: post.stats,
      raw: post.raw,
      crawled_at: new Date().toISOString(),
      published_at: post.published_at,
    },
  });
}

/**
 * # Thêm mới hoặc cập nhật danh sách bài đăng/video (Bulk-Upsert)
 */
export async function upsertPosts(posts: CrawledPostRow[]): Promise<void> {
  if (posts.length === 0) {
    return;
  }
  await supabaseRest("crawled_posts", {
    method: "POST",
    params: { on_conflict: "platform,platform_id" },
    body: posts.map((post) => ({
      platform: post.platform,
      platform_id: post.platform_id,
      author_id: post.author_id,
      caption: post.caption,
      media_urls: post.media_urls || [],
      cover_url: post.cover_url,
      stats: post.stats,
      raw: post.raw,
      crawled_at: new Date().toISOString(),
      published_at: post.published_at,
    })),
  });
}

/**
 * # Lấy id (UUID) của post từ bảng crawled_posts bằng platform và platform_id
 */
export async function getPostUuid(platform: string, platformId: string): Promise<string | undefined> {
  const result = await supabaseRest("crawled_posts", {
    params: {
      platform: `eq.${platform}`,
      platform_id: `eq.${platformId}`,
      select: "id",
    },
  });
  return result?.[0]?.id;
}

/**
 * # Thêm mới hoặc cập nhật danh sách bình luận cào được
 */
export async function upsertComments(comments: CrawledCommentRow[]): Promise<void> {
  if (comments.length === 0) {
    return;
  }
  await supabaseRest("crawled_comments", {
    method: "POST",
    params: { on_conflict: "platform,platform_cid" },
    body: comments.map((c) => ({
      platform: c.platform,
      platform_cid: c.platform_cid,
      post_id: c.post_id,
      platform_post_id: c.platform_post_id,
      parent_cid: c.parent_cid,
      author_uid: c.author_uid,
      author_nickname: c.author_nickname,
      content: c.content,
      like_count: c.like_count || 0,
      raw: c.raw,
      published_at: c.published_at,
      crawled_at: new Date().toISOString(),
    })),
  });
}
