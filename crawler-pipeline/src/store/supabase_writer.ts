import { CONFIG } from "../config.js";
import { ProxyAgent } from "undici";

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
export async function upsertAuthor(author: {
  platform: string;
  platform_uid: string;
  nickname?: string;
  avatar_url?: string;
  raw?: any;
}): Promise<string> {
  const result = await supabaseRest("crawled_authors", {
    method: "POST",
    params: { on_conflict: "platform,platform_uid" },
    body: {
      platform: author.platform,
      platform_uid: author.platform_uid,
      nickname: author.nickname,
      avatar_url: author.avatar_url,
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
export async function upsertPost(post: {
  platform: string;
  platform_id: string;
  author_id?: string;
  caption?: string;
  media_urls?: string[];
  cover_url?: string;
  stats?: any;
  raw?: any;
  published_at?: string;
}): Promise<void> {
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
