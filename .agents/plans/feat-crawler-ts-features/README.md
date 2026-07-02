# 📦 Initiative: feat-crawler-ts-features

> **Mục tiêu:** Rewrite (port) các tính năng cào còn thiếu của **MediaCrawler (Python)** sang bản **TypeScript** tại `crawler-pipeline/`, để pipeline sinh được **khối lượng lớn** dữ liệu nuôi feed cho app Expo.
>
> Tài liệu này là **điểm vào duy nhất** cho AI thực thi. Đọc hết README này trước, rồi làm theo `roadmap.md` → `todo.md` → `design/*`.

---

## 0. Bối cảnh & ràng buộc (đọc kỹ trước khi code)

- **Repo đích (được phép sửa):** `d:\Python\expo-supabase-ai-template\crawler-pipeline\` — dự án Node/TypeScript (`"type": "module"`, chạy bằng `tsx`).
- **Repo tham chiếu (⛔ CẤM sửa):** `D:\Python\ChinaMediaCrawler`, `D:\Python\socialpeta-crawl`, `D:\Python\socialpeta_downloader`. Chỉ **đọc để đối chiếu logic**. (Xem `.agents/rules/rule.md`.)
- **Điểm gặp nhau của hệ thống:** Crawler **GHI** → Supabase Postgres + Cloudflare R2 → App Expo **ĐỌC**. Không thêm phụ thuộc ngược.
- **Nguồn logic gốc để port:** `D:\Python\ChinaMediaCrawler\_mediaCrawler\media_platform\douyin\{client.py, core.py, help.py, field.py, login.py}`.
- **Kiến trúc lai (không đổi):** browser (Playwright) chỉ để login + sinh sign; HTTP (`impit`, spoof JA3) lo cào khối lượng lớn. Chi tiết: `.agents/docs/crawler-hybrid-architecture.md`.

## 1. Ngăn xếp hiện có (đã hoạt động, tái dùng — KHÔNG viết lại)

| Vai trò | File TS | Ghi chú |
|---|---|---|
| HTTP client spoof JA3 | `src/crawl/client.ts` (`impit`, `douyinRequest`, `downloadMedia`) | Tương đương `curl_cffi` của Python |
| Sinh sign `a_bogus` | `src/sign/js_sign.ts` (`signDetail`, `signReply`) + `src/sign/douyin.js` | `signReply` đã có nhưng **chưa dùng** |
| Login/session | `src/sign/browser_sign.ts` (`bootstrapSession`), `src/sign/session_store.ts` (`loadSession`/`saveSession`) | Playwright |
| Upload media R2 | `src/store/r2_uploader.ts` (`uploadMediaToR2`) | aws-sdk S3 |
| Ghi Supabase | `src/store/supabase_writer.ts` (`upsertAuthor`, `upsertPost`) | REST + service_role, upsert theo `on_conflict` |
| Cào 1 video | `src/crawl/douyin.ts` (`crawlVideo`, `resolveShortUrl`, `extractAwemeId`, `getWebId`) | Đã port từ `get_video_by_id` |
| CLI | `src/index.ts` | Lệnh: `bootstrap`, `crawl <url_or_id>` |
| Cấu hình | `src/config.ts` | Đọc `.env` ở root Expo + `crawler-pipeline/.env` |

## 2. Trạng thái port MediaCrawler → TS

| Tính năng gốc (`douyin/client.py`) | TS | Trạng thái |
|---|---|---|
| `get_video_by_id` (detail) | `crawlVideo` | ✅ xong |
| `resolve_short_url`, `get_aweme_media` | `resolveShortUrl`, `downloadMedia` | ✅ xong |
| login + sign `a_bogus` | `bootstrapSession` + `signDetail` | ✅ xong |
| **`get_all_user_aweme_posts`** (video của 1 creator) | — | ❌ **cần port** — Phase A |
| **`search_info_by_keyword`** (cào theo từ khóa) | — | ❌ **cần port** — Phase B |
| **`get_aweme_all_comments`** (bình luận) | — | ❌ **cần port** — Phase C |
| **`get_user_info`** (thông tin creator) | — | ❌ cần port (đi kèm Phase A) |
| Tách `model/` (type dữ liệu, bỏ `any`) | type inline | ⚠️ **cần làm** — Phase D (song song) |

## 3. Thứ tự thực hiện (vì sao)

1. **Phase 0 — Refactor nền tảng dùng chung** (bắt buộc làm trước): tách `douyinGet()` (client chung ký sign + common params) và `persistAweme()` (parse 1 item → upload R2 → upsert). Hiện logic này **kẹt cứng trong `crawlVideo`**; không tách thì mọi tính năng sau sẽ copy-paste.
2. **Phase A — Creator videos**: giá trị cao nhất, rủi ro thấp nhất (item trả về **cùng cấu trúc** `aweme_detail` → tái dùng `persistAweme` 100%). Biến pipeline từ "1 video" → "cào cả kênh".
3. **Phase B — Search theo từ khóa**: discovery feed. ⚠️ Search **KHÔNG** ký `a_bogus` (xem map).
4. **Phase C — Comments**: cần **thêm bảng `crawled_comments`** (migration mới). `signReply` đã sẵn.
5. **Phase D — Model/types**: dọn `any`, làm song song bất cứ lúc nào.

## 4. Cách chạy & kiểm thử (mỗi phase phải verify)

```bash
cd d:\Python\expo-supabase-ai-template\crawler-pipeline
npm install                       # nếu chưa
npx playwright install chromium   # nếu chưa có browser
npm run bootstrap                 # mở browser, đăng nhập Douyin, lưu session
npm run crawl <url_or_id>         # smoke test đường detail đã có
```

**Điều kiện môi trường bắt buộc** (nếu thiếu, đường ghi sẽ 401 / cào trả rỗng):
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase Dashboard → Settings → API) — hiện `config.ts` default rỗng.
- R2: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT_URL`, `R2_BUCKET_NAME`.
- (Khuyến nghị) `CRAWLER_PROXY` residential — Douyin từ IP ngoài TQ có thể trả rỗng/verify.

**Tiêu chí PASS mỗi phase:** chạy lệnh mới → thấy N dòng trong Supabase (`crawled_posts`/`crawled_authors`/`crawled_comments`) + file media trên R2, **không** tạo bản ghi trùng khi chạy lại (nhờ upsert).

## 5. Quy ước code (bám theo code sẵn có)

- Comment mô tả hàm bằng tiếng Việt, mở đầu `# ` như các file hiện tại.
- Import nội bộ dùng đuôi `.js` (ESM + tsx), ví dụ `from "../store/supabase_writer.js"`.
- Mọi lỗi mạng/parse của **1 item** phải `try/catch` nuốt lẻ để không làm sập cả mẻ (theo mẫu `crawlVideo`).
- Rate limit: nghỉ ngắt quãng giữa các request/trang (Douyin gốc dùng `CRAWLER_MAX_SLEEP_SEC`), concurrency thấp (2–4).

## 6. Bản đồ & thiết kế chi tiết

- `maps/douyin-api-reference.md` — **endpoint + params chính xác** (trích từ `client.py`). Đọc khi implement từng call.
- `design/00-refactor-foundation.md`
- `design/01-creator-videos.md`
- `design/02-search-keyword.md`
- `design/03-comments.md`
- `design/04-model-types.md`
- `roadmap.md`, `todo.md` — mốc & checklist.
