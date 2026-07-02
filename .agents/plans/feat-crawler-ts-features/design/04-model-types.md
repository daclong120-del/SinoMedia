# Phase D — Tách model/types (dọn `any`)

> Bản "rebuild model" đúng nghĩa cho stack TS. Làm song song, không chặn phase khác.
> **KHÔNG** port `model/*.py` của MediaCrawler (chỉ là helper parse URL nhỏ) — thay bằng type TS khớp schema Supabase + response Douyin.

## Việc cần làm — tạo `src/model/`

### 1. `src/model/storage.ts` — khớp schema Supabase
Đưa các type đang khai báo inline trong `supabase_writer.ts` ra đây, để writer và crawler cùng import:
```ts
export interface CrawledAuthorRow {
  platform: string;
  platform_uid: string;
  nickname?: string;
  avatar_url?: string;
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
export interface CrawledCommentRow { /* khớp migration Phase C */ }
```
Sửa `upsertAuthor`/`upsertPost`/`upsertComments` nhận các type này thay cho object literal inline.

### 2. `src/model/douyin.ts` — response thô Douyin (thay `any` trong douyin.ts)
Chỉ khai báo các field thực sự dùng (không cần đầy đủ):
```ts
export interface DouyinAweme {
  aweme_id: string;
  desc?: string;
  create_time?: number;
  author?: DouyinAuthor;
  video?: { play_addr?: DouyinUrlList; cover?: DouyinUrlList };
  images?: Array<{ url_list?: string[]; display_image_width_goods?: DouyinUrlList }>;
  statistics?: { digg_count?: number; comment_count?: number; share_count?: number; play_count?: number };
}
export interface DouyinAuthor { sec_uid?: string; nickname?: string; avatar_thumb?: DouyinUrlList; avatar_larger?: DouyinUrlList; }
interface DouyinUrlList { url_list?: string[]; }
```

## Tiêu chí hoàn thành
- `persistAweme` nhận `DouyinAweme` thay `any`; writer nhận type storage.
- `npx tsc --noEmit` (hoặc build) không lỗi type.
- Không đổi hành vi runtime.

## Ghi chú
- `stats`/`raw` để `unknown` là đủ (lưu jsonb). Đừng over-engineer type cho `raw`.
