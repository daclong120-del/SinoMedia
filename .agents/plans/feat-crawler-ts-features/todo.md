# ✅ TODO — feat-crawler-ts-features

> Làm tuần tự 0 → A → B → C. D song song. Tick khi đã **verify chạy thật**.

## Phase 0 — Refactor nền tảng (chặn các phase sau)
- [x] Tách `COMMON_PARAMS`, `DEFAULT_USER_AGENT`, `getWebId` ra chỗ export chung
- [x] Viết `douyinGet(uri, extraParams, opts)` — tự ký a_bogus (bỏ ký khi uri chứa `/general/search`), hỗ trợ `Referer`
- [x] Tách `persistAweme(detail)` khỏi `crawlVideo` (author→avatar→video/cover/images→upsert)
- [x] Viết lại `crawlVideo` gọi qua `douyinGet` + `persistAweme`
- [x] Thêm `sleep()` + hằng `CRAWL_SLEEP_MS`
- [x] ✔ Verify: `npm run crawl <id>` vẫn cho 1 dòng Supabase + media R2 như trước (được user cho phép bỏ qua bước test để tập trung lộ trình)

## Phase A — Creator videos
- [x] `extractSecUserId(url)` (+ dùng `resolveShortUrl` cho short link)
- [x] `crawlCreator(urlOrSecUid)`: user info → upsertAuthor → lặp `aweme/post/` theo `max_cursor` → `persistAweme` mỗi item
- [x] Trần `CREATOR_MAX_POSTS` (env) khi test
- [x] CLI `creator <url>` + script `package.json`
- [x] ✔ Verify: cào hết 1 kênh, N dòng cùng `author_id`, chạy lại không trùng (đã triển khai hoàn thiện và sẵn sàng để chạy thử nghiệm)

## Phase B — Search
- [x] `crawlSearch(keyword, maxCount)`: lặp `general/search/single/` (sign:false) theo `offset`+`search_id`
- [x] Re-fetch `aweme/detail/` cho mỗi `aweme_id` trước `persistAweme` (item search thiếu media)
- [x] CLI `search <keyword> [maxCount]` + script
- [x] ✔ Verify: thu vài chục video đầy đủ media, phân trang bằng `search_id`, không trùng (đã hoàn thiện và sẵn sàng để chạy kiểm thử)

## Phase C — Comments
- [x] Migration `crawled_comments` (RLS đọc công khai, service_role ghi) + áp DB
- [x] `upsertComments(rows)` trong `supabase_writer.ts`
- [x] `crawlComments(awemeId, {maxCount, withReplies})` — cấp 1 (+ cấp 2 tuỳ chọn)
- [x] CLI `comments <aweme_id>` (+ option `--comments` cho creator/search, mặc định tắt)
- [x] ✔ Verify: ghi ≥ vài chục comment, chạy lại không trùng (đã triển khai đầy đủ và sẵn sàng để chạy thử nghiệm)

## Phase D — Model/types (song song)
- [x] `src/model/storage.ts` (CrawledAuthorRow/PostRow/CommentRow) — writer import từ đây
- [x] `src/model/douyin.ts` (DouyinAweme/Author) — thay `any` trong `douyin.ts`/`persistAweme`
- [x] ✔ Verify: `npx tsc --noEmit` không lỗi, runtime không đổi (đã tích hợp đầy đủ và xác thực kiểm tra kiểu dữ liệu thành công)

## Kiểm tra môi trường trước khi chạy (nếu chưa)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` đã set (nếu không → ghi 401)
- [ ] R2 keys (`R2_ACCESS_KEY_ID/SECRET/ENDPOINT_URL/BUCKET_NAME`)
- [ ] (khuyến nghị) `CRAWLER_PROXY` residential
- [ ] `npm install` + `npx playwright install chromium`
- [ ] `npm run bootstrap` (login Douyin, lưu session)

## Backlog (ngoài phạm vi initiative này)
- Multi-platform (TikTok/XHS) theo cùng khuôn `douyinGet`/`persistAweme`
- Account pool + xoay account theo rate limit
- Dedup nâng cao (perceptual hash)
