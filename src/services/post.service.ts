/**
 * # Service bài đăng — các thao tác CRUD posts từ Supabase
 */

import { supabase } from "../../lib/supabase";
import type { Post, PostFilters } from "../types/post";

/**
 * # Lấy danh sách posts với phân trang và lọc
 */
export async function getPosts(filters: PostFilters = {}) {
  const { platform, limit = 20, offset = 0, orderBy = "published_at" } = filters;

  let query = supabase
    .from("posts")
    .select("*, authors(nickname, avatar_url)")
    .order(orderBy, { ascending: false })
    .range(offset, offset + limit - 1);

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * # Lấy chi tiết một post theo UUID
 */
export async function getPostById(id: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("*, authors(nickname, avatar_url, platform_uid)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * # Lấy danh sách comments của một post
 */
export async function getCommentsByPostId(postId: string, limit = 50) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * # Lấy thông tin creator/author theo UUID
 */
export async function getAuthorById(authorId: string) {
  const { data, error } = await supabase
    .from("authors")
    .select("*")
    .eq("id", authorId)
    .single();

  if (error) throw error;
  return data;
}
