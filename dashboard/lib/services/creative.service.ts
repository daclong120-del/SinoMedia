/**
 * Service — Creative Hub (Ads, Advertisers, Trending, Growth)
 * Phục vụ các trang Creative > Search, Trending, New, Growth, Advertisers, Detail.
 */
import { createClientServer } from "@/lib/supabase/server";
import { PostRepository, type PostQueryOpts } from "@/lib/repositories/post.repo";
import { AuthorRepository } from "@/lib/repositories/author.repo";
import type { CreativeAd, CreativeAdvertiser, Platform } from "@/types";

// ─── Mappers ─────────────────────────────────────────────────

function mapPostToCreativeAd(row: Record<string, unknown>, author?: Record<string, unknown> | null): CreativeAd {
  const stats = (row.stats as Record<string, number>) || {};
  const views = stats.play_count || stats.view_count || 0;
  const likes = stats.like_count || 0;
  const comments = stats.comment_count || 0;
  const shares = stats.share_count || 0;

  // Sinh views_history mô phỏng dựa trên tổng views
  const viewsHistory = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split("T")[0],
      count: Math.round(views * (0.4 + i * 0.1)),
    };
  });

  return {
    id: row.id as string,
    platform: row.platform as Platform,
    author_id: (row.author_id as string) || "",
    platform_uid: (row.platform_id as string) || "",
    title: (row.caption as string)?.slice(0, 30) || "",
    caption: (row.caption as string) || "",
    cover_url: (row.cover_url as string) || "",
    media_type: row.cover_url ? "video" : "image",
    like_count: likes,
    view_count: views,
    comment_count: comments,
    share_count: shares,
    media_urls: (row.media_urls as string[]) || [],
    tags: (row.tags as string[]) || [],
    published_at: (row.published_at as string) || (row.crawled_at as string) || "",
    crawled_at: (row.crawled_at as string) || "",
    is_ad: true,
    growth_rate: 0, // TODO: tính growth rate thật từ lịch sử
    views_history: viewsHistory,
  };
}

function mapAuthorToAdvertiser(
  author: Record<string, unknown>,
  postCount: number,
  totalViews: number,
  totalLikes: number,
): CreativeAdvertiser {
  return {
    id: author.id as string,
    platform_uid: (author.platform_uid as string) || "",
    nickname: (author.nickname as string) || "Unknown",
    platform: author.platform as Platform,
    avatar_url: (author.avatar_url as string) || "",
    description: (author.description as string) || "",
    creative_count: postCount,
    total_views: totalViews,
    total_likes: totalLikes,
    follows_count: (author.follows_count as number) || 0,
    fans_count: (author.fans_count as number) || 0,
    crawled_at: (author.updated_at as string) || (author.created_at as string) || "",
    last_active_at: (author.updated_at as string) || "",
  };
}

// ─── Service Functions ───────────────────────────────────────

/** Tìm kiếm creative ads (bài viết) với bộ lọc đầy đủ */
export async function searchAds(opts: PostQueryOpts & { page?: number } = {}): Promise<{
  data: CreativeAd[];
  page: number;
  limit: number;
  total: number;
}> {
  const db = await createClientServer();
  const postRepo = new PostRepository(db);
  const authorRepo = new AuthorRepository(db);

  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const offset = (page - 1) * limit;

  const { data: posts, count } = await postRepo.findMany({
    ...opts,
    limit,
    offset,
  });

  if (posts.length === 0) {
    return { data: [], page, limit, total: count };
  }

  // Lấy thông tin tác giả tương ứng
  const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean))];
  const authors = authorIds.length > 0
    ? await authorRepo.findByIds(authorIds)
    : [];
  const authorsMap = new Map(authors.map((a) => [a.id, a]));

  const data = posts.map((post) => {
    const author = post.author_id ? authorsMap.get(post.author_id) : null;
    return mapPostToCreativeAd(post, author);
  });

  return { data, page, limit, total: count };
}

/** Lấy chi tiết 1 creative ad */
export async function getAdById(id: string): Promise<CreativeAd | null> {
  const db = await createClientServer();
  const postRepo = new PostRepository(db);

  try {
    const row = await postRepo.findById(id);
    return mapPostToCreativeAd(row);
  } catch {
    return null;
  }
}

/** Lấy danh sách advertisers (tác giả + thống kê bài viết) */
export async function getAdvertisers(opts: {
  platform?: string;
  search?: string;
  limit?: number;
} = {}): Promise<{ data: CreativeAdvertiser[]; total: number }> {
  const db = await createClientServer();
  const authorRepo = new AuthorRepository(db);
  const postRepo = new PostRepository(db);

  const { data: authors, count } = await authorRepo.findMany({
    platform: opts.platform,
    search: opts.search,
    limit: opts.limit ?? 100,
  });

  // Tính thống kê bài viết cho mỗi tác giả
  const advertiserPromises = authors.map(async (author) => {
    const { data: posts } = await postRepo.findByAuthorId(author.id, 1000);
    let totalViews = 0;
    let totalLikes = 0;
    posts.forEach((p) => {
      const stats = (p.stats as Record<string, number>) || {};
      totalViews += stats.play_count || stats.view_count || 0;
      totalLikes += stats.like_count || 0;
    });
    return mapAuthorToAdvertiser(author, posts.length, totalViews, totalLikes);
  });

  const data = await Promise.all(advertiserPromises);
  return { data, total: count };
}

/** Lấy chi tiết 1 advertiser + danh sách bài viết của họ */
export async function getAdvertiserById(id: string): Promise<{
  advertiser: CreativeAdvertiser | null;
  ads: CreativeAd[];
} | null> {
  const db = await createClientServer();
  const authorRepo = new AuthorRepository(db);
  const postRepo = new PostRepository(db);

  try {
    const author = await authorRepo.findById(id);
    const { data: posts } = await postRepo.findByAuthorId(id, 100);

    let totalViews = 0;
    let totalLikes = 0;
    posts.forEach((p) => {
      const stats = (p.stats as Record<string, number>) || {};
      totalViews += stats.play_count || stats.view_count || 0;
      totalLikes += stats.like_count || 0;
    });

    const advertiser = mapAuthorToAdvertiser(author, posts.length, totalViews, totalLikes);
    const ads = posts.map((p) => mapPostToCreativeAd(p, author));

    return { advertiser, ads };
  } catch {
    return null;
  }
}

/** Lấy bài viết trending (sắp xếp theo lượt xem) */
export async function getTrending(limit = 20): Promise<CreativeAd[]> {
  const result = await searchAds({ sort: "views", limit });
  return result.data;
}

/** Lấy bài viết mới nhất */
export async function getNew(limit = 20): Promise<CreativeAd[]> {
  const result = await searchAds({ sort: "newest", limit });
  return result.data;
}

/** Lấy bài viết tăng trưởng nhanh — TODO: cần bảng lịch sử views để tính growth thật */
export async function getGrowth(limit = 20): Promise<CreativeAd[]> {
  const result = await searchAds({ sort: "views", limit });
  return result.data;
}

/** Lấy bài viết tương tự (cùng platform, loại trừ bài hiện tại) */
export async function getSimilar(platform: string, currentAdId: string, limit = 8): Promise<CreativeAd[]> {
  const result = await searchAds({ platform, limit: limit + 1 });
  return result.data.filter((ad) => ad.id !== currentAdId).slice(0, limit);
}
