# Phase A — Cào toàn bộ video của 1 creator

> Port `get_user_info` + `get_all_user_aweme_posts` + `get_creators_and_videos` (core.py) sang TS.
> **Ưu tiên #1**: reuse `persistAweme` gần 100%, biến pipeline "1 video" → "cào cả kênh".

## Endpoint (chi tiết: `maps/douyin-api-reference.md` mục 2–3)
- User info: `GET /aweme/v1/web/user/profile/other/` params `{ sec_user_id, publish_video_strategy_type:2, personal_center_strategy:1 }`
- Posts: `GET /aweme/v1/web/aweme/post/` params `{ sec_user_id, count:18, max_cursor, locate_query:"false", publish_video_strategy_type:2 }` → `{ aweme_list, has_more, max_cursor }`

## Cần implement (trong `src/crawl/douyin.ts`)

### 1. Parse sec_user_id từ URL creator
Thêm `extractSecUserId(url)`: regex `/user/([\w-]+)` từ URL `douyin.com/user/<sec_uid>`; nếu là short link → `resolveShortUrl` trước. (Đối chiếu `parse_creator_info_from_url` trong `help.py`.)

### 2. `crawlCreator(urlOrSecUid)`
```
secUid = extractSecUserId(urlOrSecUid)
info = await douyinGet("/aweme/v1/web/user/profile/other/", { sec_user_id: secUid, ... })
// lưu author (nickname/avatar) — có thể để persistAweme tự upsert author từ mỗi video,
// nhưng nên upsertAuthor sớm từ info.user để có avatar đầy đủ.
let maxCursor = "", hasMore = 1;
while (hasMore === 1) {
  res = await douyinGet("/aweme/v1/web/aweme/post/", { sec_user_id: secUid, count:"18", max_cursor:maxCursor, locate_query:"false", publish_video_strategy_type:"2" });
  for (item of res.aweme_list ?? []) {
    try {
      // item ~ aweme_detail; AN TOÀN: re-fetch detail để đủ field media chất lượng cao
      const detail = (await douyinGet("/aweme/v1/web/aweme/detail/", { aweme_id: item.aweme_id })).aweme_detail ?? item;
      await persistAweme(detail);
    } catch (e) { /* log, bỏ qua item */ }
    await sleep(CRAWL_SLEEP_MS);
  }
  hasMore = res.has_more ?? 0;
  maxCursor = res.max_cursor ?? "";
  await sleep(CRAWL_SLEEP_MS);
}
```
- **Quyết định re-fetch detail hay dùng item trực tiếp:** `aweme_list` thường đã đủ để `persistAweme`. Re-fetch cho chắc chất lượng media nhưng tốn gấp đôi request. → Mặc định **dùng item trực tiếp**; chỉ re-fetch khi item thiếu `video.play_addr`/`images`. Ghi `log()` số item bỏ qua.

### 3. CLI
Thêm lệnh vào `src/index.ts`: `creator <url_or_sec_uid>` → `crawlCreator(...)`. Thêm script `package.json`: `"creator": "tsx src/index.ts creator"`.

## Tiêu chí hoàn thành
- `npm run creator <url>` cào hết video của 1 kênh, phân trang tới `has_more=0`.
- N dòng `crawled_posts` cùng 1 `author_id`, media trên R2, chạy lại không trùng.
- Có nghỉ giữa trang/item (không dồn dập).

## ⚠️ Bẫy
- `max_cursor` là **string** — truyền đúng kiểu, đừng ép number.
- Kênh lớn → nhiều trang; đặt trần tuỳ chọn (vd env `CREATOR_MAX_POSTS`) để test không chạy vô hạn.
