/**
 * # Enums và types đặc thù Tieba (百度贴吧)
 */

export enum TiebaSortType {
  DEFAULT = 0,
  NEWEST = 1,
  HOT = 2,
}

export interface TiebaPostInfo {
  threadId: string;
  forumName: string;
}

export interface TiebaCreatorInfo {
  userId: string;
  userName: string;
}
