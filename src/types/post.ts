/**
 * # Kiểu dữ liệu Post, Comment, Author cho Expo app
 */

export interface Post {
  id: string;
  platform: string;
  platform_id: string;
  author_id: string;
  caption: string;
  media_urls: string[];
  cover_url?: string;
  stats: PostStats;
  raw?: any;
  published_at: string;
  created_at: string;
  author?: Author;
}

export interface PostStats {
  digg_count: number;
  comment_count: number;
  share_count: number;
  play_count: number;
}

export interface Comment {
  id: string;
  platform: string;
  platform_cid: string;
  post_id: string;
  platform_post_id: string;
  parent_cid?: string;
  author_uid: string;
  author_nickname: string;
  content: string;
  like_count: number;
  published_at?: string;
}

export interface Author {
  id: string;
  platform: string;
  platform_uid: string;
  nickname: string;
  avatar_url?: string;
}

export interface PostFilters {
  platform?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
}
