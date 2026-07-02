export interface CrawledAuthorRow {
  platform: string;
  platform_uid: string;
  nickname?: string;
  avatar_url?: string;
  gender?: string;
  description?: string;
  follows_count?: number;
  fans_count?: number;
  interaction_count?: number;
  videos_count?: number;
  ip_location?: string;
  raw?: unknown;
}

export interface CrawledPostRow {
  platform: string;
  platform_id: string;
  author_id?: string;
  caption?: string;
  media_urls?: string[];
  cover_url?: string;
  stats?: unknown;
  raw?: unknown;
  published_at?: string;
}

export interface CrawledCommentRow {
  platform: string;
  platform_cid: string;
  post_id?: string;
  platform_post_id: string;
  parent_cid?: string;
  author_uid?: string;
  author_nickname?: string;
  content?: string;
  like_count?: number;
  raw?: unknown;
  published_at?: string;
}
