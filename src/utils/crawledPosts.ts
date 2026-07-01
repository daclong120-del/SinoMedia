import { supabase } from "@/lib/supabase";

export interface CrawledAuthor {
  id: string;
  platform: string;
  platform_uid: string;
  nickname: string;
  avatar_url?: string;
  updated_at: string;
}

export interface CrawledPost {
  id: string;
  platform: string;
  platform_id: string;
  author_id?: string;
  caption?: string;
  media_urls: string[];
  cover_url?: string;
  stats?: {
    digg_count: number;
    comment_count: number;
    share_count: number;
    play_count: number;
  };
  raw?: any;
  crawled_at: string;
  published_at?: string;
  crawled_authors?: CrawledAuthor;
}

/**
 * # Phân giải key của Cloudflare R2 thành URL truy cập trực tiếp public
 */
export function resolveMediaUrl(key: string | undefined | null): string {
  if (!key) {
    return "";
  }
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }
  const base = process.env.EXPO_PUBLIC_R2_PUBLIC_URL || "https://pub-61ef6f7c6215df3616424def03fa7070.r2.dev";
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${cleanBase}/${key}`;
}

/**
 * # Lấy danh sách các bài đăng đã cào từ Supabase có phân trang và lọc theo platform
 */
export async function fetchCrawledPosts(options: {
  platform?: string;
  page?: number;
  size?: number;
} = {}): Promise<CrawledPost[]> {
  const page = options.page ?? 0;
  const size = options.size ?? 20;

  let query = supabase
    .from("crawled_posts")
    .select("*, crawled_authors(*)")
    .order("crawled_at", { ascending: false })
    .range(page * size, page * size + size - 1);

  if (options.platform) {
    query = query.eq("platform", options.platform);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data as any[]) || [];
}

/**
 * # Lấy chi tiết một bài viết đã cào qua ID bài viết
 */
export async function fetchCrawledPostById(id: string): Promise<CrawledPost> {
  const { data, error } = await supabase
    .from("crawled_posts")
    .select("*, crawled_authors(*)")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as any;
}
