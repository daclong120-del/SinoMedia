import { supabaseRest } from "./supabase_client.js";
import { CrawledAuthorRow, CrawledPostRow, CrawledCommentRow } from "../model/storage.js";

/**
 * # Thêm mới hoặc cập nhật thông tin tác giả và trả về UUID tương ứng
 */
export async function upsertAuthor(author: CrawledAuthorRow): Promise<string> {
  const authorId = `${author.platform}_${author.platform_uid}`;
  const result = await supabaseRest("crawled_authors", {
    method: "POST",
    params: { on_conflict: "platform,platform_uid" },
    body: {
      id: authorId,
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

function normalizeStats(stats: any): any {
  if (typeof stats !== "object" || stats === null || Array.isArray(stats)) {
    return stats;
  }
  const normalized = { ...stats };
  
  // Normalize likes
  const likes = stats.like_count || stats.digg_count || stats.liked_count || stats.voteup_count || stats.voteupCount || 0;
  normalized.like_count = likes;
  normalized.digg_count = likes;
  normalized.liked_count = likes;
  
  // Normalize views
  const views = stats.play_count || stats.view_count || stats.playCount || 0;
  normalized.play_count = views;
  normalized.view_count = views;
  
  // Normalize comments
  const comments = stats.comment_count || stats.comments_count || stats.commentCount || 0;
  normalized.comment_count = comments;
  normalized.comments_count = comments;
  
  // Normalize shares
  const shares = stats.share_count || stats.shared_count || stats.shareCount || 0;
  normalized.share_count = shares;
  normalized.shared_count = shares;
  
  return normalized;
}

/**
 * # Thêm mới hoặc cập nhật thông tin bài đăng/video
 */
export async function upsertPost(post: CrawledPostRow): Promise<void> {
  const taskTagsStr = process.env.CURRENT_TASK_TAGS;
  const taskTags: string[] = taskTagsStr ? JSON.parse(taskTagsStr) : [];
  const mergedTags = Array.from(new Set([...(post.tags || []), ...taskTags]));

  const taskLang = process.env.CURRENT_TASK_LANGUAGE;
  const mergedLang = post.language && post.language !== "auto" ? post.language : (taskLang || "auto");

  await supabaseRest("crawled_posts", {
    method: "POST",
    params: { on_conflict: "platform,platform_id" },
    body: {
      id: `${post.platform}_${post.platform_id}`,
      platform: post.platform,
      platform_id: post.platform_id,
      author_id: post.author_id,
      caption: post.caption,
      media_urls: post.media_urls || [],
      cover_url: post.cover_url,
      stats: normalizeStats(post.stats),
      raw: post.raw,
      crawled_at: new Date().toISOString(),
      published_at: post.published_at,
      tags: mergedTags,
      language: mergedLang,
      media_type: post.media_type || "unknown",
      original_media_urls: post.original_media_urls || post.media_urls || [],
      original_cover_url: originalCoverUrlHelper(post),
      media_status: post.media_status || "original_only",
      media_source: post.media_source || "original",
      media_error: post.media_error || null,
      media_cached_at: post.media_cached_at || null,
    },
  });
}

function originalCoverUrlHelper(post: CrawledPostRow): string | null {
  return post.original_cover_url || post.cover_url || null;
}

/**
 * # Thêm mới hoặc cập nhật danh sách bài đăng/video (Bulk-Upsert)
 */
export async function upsertPosts(posts: CrawledPostRow[]): Promise<void> {
  if (posts.length === 0) {
    return;
  }
  const taskTagsStr = process.env.CURRENT_TASK_TAGS;
  const taskTags: string[] = taskTagsStr ? JSON.parse(taskTagsStr) : [];
  const taskLang = process.env.CURRENT_TASK_LANGUAGE;

  await supabaseRest("crawled_posts", {
    method: "POST",
    params: { on_conflict: "platform,platform_id" },
    body: posts.map((post) => {
      const mergedTags = Array.from(new Set([...(post.tags || []), ...taskTags]));
      const mergedLang = post.language && post.language !== "auto" ? post.language : (taskLang || "auto");
      return {
        id: `${post.platform}_${post.platform_id}`,
        platform: post.platform,
        platform_id: post.platform_id,
        author_id: post.author_id || null,
        caption: post.caption || null,
        media_urls: post.media_urls || [],
        cover_url: post.cover_url || null,
        stats: normalizeStats(post.stats) || null,
        raw: post.raw || null,
        crawled_at: new Date().toISOString(),
        published_at: post.published_at || null,
        tags: mergedTags,
        language: mergedLang,
        media_type: post.media_type || "unknown",
        original_media_urls: post.original_media_urls || post.media_urls || [],
        original_cover_url: post.original_cover_url || post.cover_url || null,
        media_status: post.media_status || "original_only",
        media_source: post.media_source || "original",
        media_error: post.media_error || null,
        media_cached_at: post.media_cached_at || null,
      };
    }),
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

/**
 * # Kiểm tra xem task đã bị huỷ ngoài UI hay chưa
 */
export async function isTaskCancelled(taskId: string | null | undefined): Promise<boolean> {
  if (!taskId) return false;
  try {
    const res = await supabaseRest("crawler_tasks", {
      method: "GET",
      params: {
        id: `eq.${taskId}`,
        select: "status"
      }
    });
    if (Array.isArray(res) && res[0]) {
      return res[0].status === "cancelled";
    }
  } catch (err) {
    console.error(`Lỗi khi check trạng thái huỷ của task: ${(err as Error).message}`);
  }
  return false;
}

/**
 * # Cập nhật tiến độ của task hiện tại vào metadata
 */
export async function updateTaskProgress(taskId: string | null | undefined, current: number, target: number): Promise<void> {
  if (!taskId) return;
  try {
    const res = await supabaseRest("crawler_tasks", {
      method: "GET",
      params: {
        id: `eq.${taskId}`,
        select: "metadata"
      }
    });
    if (Array.isArray(res) && res[0]) {
      const metadata = res[0].metadata || {};
      metadata.progress = { current, target };
      await supabaseRest("crawler_tasks", {
        method: "PATCH",
        params: { id: `eq.${taskId}` },
        body: {
          metadata,
          updated_at: new Date().toISOString(),
        }
      });
    }
  } catch (err) {
    console.error(`Lỗi khi cập nhật tiến độ task: ${(err as Error).message}`);
  }
}
