/**
 * Repository — crawled_comments
 * Tầng duy nhất chạm bảng `crawled_comments` trong Supabase.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export class CommentRepository {
  constructor(private db: any) {}

  /** Lấy danh sách bình luận theo bài viết */
  async findByPostId(postId: string, limit = 100) {
    const { data, error } = await this.db
      .from("crawled_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }
}
