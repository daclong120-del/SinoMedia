/**
 * # Các enum và hằng số dùng chung cho toàn bộ crawler pipeline
 */

export enum PlatformType {
  DOUYIN = "douyin",
  TIKTOK = "tiktok",
  XHS = "xhs",
  BILIBILI = "bilibili",
  KUAISHOU = "kuaishou",
  WEIBO = "weibo",
}

export enum CrawlType {
  SEARCH = "search",
  DETAIL = "detail",
  CREATOR = "creator",
  COMMENTS = "comments",
}

export enum SortType {
  DEFAULT = 0,
  NEWEST = 1,
  MOST_LIKED = 2,
}

export enum MediaType {
  VIDEO = "video",
  IMAGE = "image",
  AVATAR = "avatar",
  COVER = "cover",
}

export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const CRAWL_DEFAULTS = {
  maxPage: 20,
  maxComments: 50,
  sleepMs: 1500,
  browserRecycleThreshold: 50,
  requestTimeoutMs: 30000,
} as const;
