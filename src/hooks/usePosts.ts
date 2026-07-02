/**
 * # Hook truy vấn posts — lấy danh sách bài đăng từ Supabase
 * Bọc logic query Supabase thành hook React với phân trang
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";

interface Post {
  id: string;
  platform: string;
  platform_id: string;
  caption: string;
  media_urls: string[];
  cover_url?: string;
  stats: Record<string, number>;
  published_at: string;
  author?: {
    nickname: string;
    avatar_url?: string;
  };
}

interface UsePostsOptions {
  platform?: string;
  limit?: number;
  orderBy?: string;
}

interface UsePostsResult {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * # Hook lấy danh sách posts với phân trang và lọc theo platform
 */
export function usePosts(options: UsePostsOptions = {}): UsePostsResult {
  const { platform, limit = 20, orderBy = "published_at" } = options;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchPosts = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);

    const currentOffset = reset ? 0 : offset;

    try {
      let query = supabase
        .from("posts")
        .select("*, authors(nickname, avatar_url)")
        .order(orderBy, { ascending: false })
        .range(currentOffset, currentOffset + limit - 1);

      if (platform) {
        query = query.eq("platform", platform);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const newPosts = data ?? [];
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setHasMore(newPosts.length === limit);
      setOffset(currentOffset + newPosts.length);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [platform, limit, orderBy, offset]);

  useEffect(() => {
    fetchPosts(true);
  }, [platform, orderBy]);

  const loadMore = useCallback(() => fetchPosts(false), [fetchPosts]);
  const refresh = useCallback(() => fetchPosts(true), [fetchPosts]);

  return { posts, loading, error, hasMore, loadMore, refresh };
}
