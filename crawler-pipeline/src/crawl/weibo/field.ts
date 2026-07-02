/**
 * # Enums và types đặc thù Weibo (微博)
 */

export enum WeiboSearchType {
  DEFAULT = "typeall",
  REALTIME = "realtime",
  HOT = "hot",
  MEDIA = "media",
}

export enum WeiboSortType {
  DEFAULT = 0,
  NEWEST = 1,
  HOT = 2,
}

export interface WeiboPostInfo {
  mblogId: string;
}

export interface WeiboCreatorInfo {
  userId: string;
}
