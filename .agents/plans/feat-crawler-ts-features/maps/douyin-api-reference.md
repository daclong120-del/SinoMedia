# 🗺️ Map — Douyin Web API reference (trích từ MediaCrawler gốc)

> Nguồn: `D:\Python\ChinaMediaCrawler\_mediaCrawler\media_platform\douyin\client.py` (⛔ chỉ đọc).
> Host: `https://www.douyin.com`. Mọi endpoint là **GET** (trừ ghi chú).

## Common params (gắn vào MỌI request)
Đã có sẵn trong `crawlVideo` tại `src/crawl/douyin.ts` (biến `params`). Trích ra dùng chung ở Phase 0:

```
device_platform=webapp, aid=6383, channel=channel_pc_web,
version_code=190600, version_name=19.6.0, update_version_code=170400,
pc_client_type=1, cookie_enabled=true, browser_language=zh-CN,
browser_platform=MacIntel, browser_name=Chrome, browser_version=125.0.0.0,
browser_online=true, engine_name=Blink, os_name=Mac OS, os_version=10.15.7,
cpu_core_num=8, device_memory=8, engine_version=109.0, platform=PC,
screen_width=2560, screen_height=1440, effective_type=4g, round_trip_time=50,
webid=<getWebId()>, msToken=<session.msToken>
```

## Ký a_bogus — QUY TẮC QUAN TRỌNG
- Trong Python `__process_req_params`: **nếu URI chứa `"/v1/web/general/search"` thì KHÔNG thêm `a_bogus`**. Mọi endpoint khác **bắt buộc** thêm `a_bogus` = `signDetail(queryString, userAgent)`.
- Nghĩa là: **detail / creator posts / user info / comments → CÓ ký `a_bogus`. Search → KHÔNG ký.**
- Cách hiện tại (`crawlVideo`): build `queryString` từ params đã `encodeURIComponent` → `a_bogus = signDetail(queryString, UA)` → URL cuối `?<queryString>&a_bogus=<a_bogus>`.

---

## 1. Detail (ĐÃ PORT — tham chiếu)
- `GET /aweme/v1/web/aweme/detail/`
- params: `{ aweme_id }`
- header gốc xoá `Origin`.
- Response: `res.aweme_detail` (object).

## 2. Creator — thông tin user  → Phase A
- `GET /aweme/v1/web/user/profile/other/`
- params: `{ sec_user_id, publish_video_strategy_type: 2, personal_center_strategy: 1 }`
- Response: object user (chứa `user.nickname`, `user.avatar_*`, `user.sec_uid`…). Dùng cho `upsertAuthor`.

## 3. Creator — danh sách video  → Phase A
- `GET /aweme/v1/web/aweme/post/`
- params: `{ sec_user_id, count: 18, max_cursor: "", locate_query: "false", publish_video_strategy_type: 2 }`
- Response: `{ aweme_list: [...], has_more: 0|1, max_cursor }`
- **Phân trang:** lặp `while (has_more === 1)`, gán `max_cursor = res.max_cursor` mỗi vòng.
- Mỗi phần tử `aweme_list[i]` **cùng cấu trúc** với `aweme_detail` (có `.author`, `.video`, `.images`, `.statistics`, `.desc`, `.create_time`, `.aweme_id`) → đưa thẳng vào `persistAweme()`.

## 4. Search theo từ khóa  → Phase B  (KHÔNG ký a_bogus)
- `GET /aweme/v1/web/general/search/single/`
- params:
  ```
  search_channel=aweme_general, enable_history=1, keyword=<kw>,
  search_source=tab_search, query_correct_type=1, is_filter_search=0,
  from_group_id=7378810571505847586, offset=<page*10-10>, count=15,
  need_filter_settings=1, list_type=multi, search_id=<lấy từ trang trước>
  ```
  (Nếu lọc theo sort/publish_time: thêm `filter_selected=JSON({sort_type,publish_time})`, `is_filter_search=1`.)
- header: đặt `Referer = encodeURI("https://www.douyin.com/search/<keyword>?aid=f594bbd9-a0e2-4651-9319-ebe3cb6298c1&type=general")`.
- Response: `{ data: [...], extra: { logid } }`.
  - `search_id` trang kế = `res.extra.logid`.
  - Mỗi item: `aweme_info = item.aweme_info ?? item.aweme_mix_info.mix_items[0]`. Lấy `aweme_info.aweme_id`.
  - ⚠️ item search có thể **thiếu field** so với detail → sau khi lấy `aweme_id`, gọi lại **Detail (mục 1)** cho đầy đủ trước khi `persistAweme` (giống `search()` gốc gọi `update_douyin_aweme(aweme_info)` nhưng an toàn hơn nếu re-fetch detail).
- **Phân trang gốc:** `dy_limit_count = 10`; `offset = page*10 - 10`; dừng khi `data` rỗng hoặc đạt `CRAWLER_MAX_NOTES_COUNT`.
- `SearchChannelType.GENERAL = "aweme_general"`; `SearchSortType.GENERAL = 0`; `PublishTimeType.UNLIMITED = 0` (xác nhận trong `douyin/field.py`).

## 5. Comments — cấp 1  → Phase C
- `GET /aweme/v1/web/comment/list/`
- params: `{ aweme_id, cursor: 0, count: 20, item_type: 0 }`
- header: `Referer = encodeURI("https://www.douyin.com/search/<kw>?...&type=general")` (kw có thể để rỗng/generic khi không đi từ search).
- Response: `{ comments: [...], has_more, cursor }`.
- **Phân trang:** `while (has_more && result.length < max_count)`, `cursor = res.cursor`.

## 6. Comments — cấp 2 (reply)  → Phase C (tuỳ chọn)
- `GET /aweme/v1/web/comment/list/reply/`
- params: `{ comment_id, cursor: 0, count: 20, item_type: 0, item_id: aweme_id }`
- Response giống mục 5. Chỉ gọi khi `comment.reply_comment_total > 0`.
- Field 1 comment: `cid`, `text`, `create_time`, `digg_count`, `reply_comment_total`, `user` (nickname, sec_uid, avatar…).

## 7. Short URL & media (ĐÃ PORT — tham chiếu)
- `resolve_short_url`: GET `v.douyin.com/...` với `redirect: manual` → lấy header `Location`.
- media: GET url `follow_redirects=true` → bytes (đã có `downloadMedia`).

---

## Trích field video (từ `crawlVideo` — dùng cho persistAweme)
```
detail.author.{sec_uid, nickname, avatar_thumb.url_list[0], avatar_larger.url_list[0]}
detail.video.play_addr.url_list[0]        → video.mp4
detail.video.cover.url_list[0]            → cover.jpg
detail.images[i].url_list[0] (hoặc display_image_width_goods.url_list[0]) → image_i.jpg
detail.desc                               → caption
detail.create_time (giây)                 → published_at = new Date(t*1000).toISOString()
detail.statistics.{digg_count, comment_count, share_count, play_count} → stats
detail.aweme_id                           → platform_id
```
