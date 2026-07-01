# ✅ TODO — feat-crawler-pipeline

## Phase hiện tại: Phase 4 — HTTP crawl workers + ghi Supabase & upload R2

### Phase 1 — Bảo mật (làm trước tiên, chặn các phase sau)
- [x] Thêm `api.txt` vào `.gitignore`
- [x] Chuyển toàn bộ secret trong `api.txt` sang `.env` (Expo) và `supabase/.env.local` (backend) đúng biến
- [x] Kiểm tra `git log`/`git ls-files` xác nhận secret chưa từng bị commit
- [x] Ghi chú cho user: **tự rotate R2 token + Supabase key** trên dashboard nếu file từng bị lộ
- [x] Xóa nội dung nhạy cảm khỏi `api.txt` (chỉ giữ link dashboard, không giữ key)

### Phase 2 — Schema Supabase
- [x] Tạo migration mới trong `supabase/migrations/` cho bảng `crawled_posts` (+ `crawled_authors` nếu cần)
- [x] Thêm index + ràng buộc `unique(platform, platform_id)` chống trùng
- [x] Bật RLS: chặn ghi từ anon, chỉ cho service_role ghi; cho phép đọc công khai (hoặc theo auth)
- [x] Tạo bucket R2 (hoặc xác nhận bucket có sẵn) cho media

### Phase 3 — Khung crawler + Sign Service
- [x] Chốt vị trí repo crawler (mới hay dùng `D:\Python\socialpeta-crawl`)
- [x] Chốt nền tảng đích + chọn thư viện sign tương ứng
- [x] Scaffold project Python (pyproject/requirements, cấu trúc thư mục) -> đã đổi sang TypeScript cho đồng bộ
- [x] Cài `cloakbrowser`, `curl_cffi`, `supabase`/`httpx`, `boto3` -> đã cài `cloakbrowser` và `playwright-core` bản Node/TS
- [x] Viết Sign Service: login + lấy cookie/msToken + trích/gọi hàm sign, expose nội bộ

### Phase 4 — Crawl workers + ghi dữ liệu
- [x] Viết worker `curl_cffi impersonate` cào list → detail → comment (đã port sang NodeJS fetch)
- [x] Tích hợp sinh chữ ký (ưu tiên Node/PyExecJS; fallback gọi Sign Service)
- [x] Ghi vào Supabase qua REST + service_role key (upsert theo `platform_id`)
- [x] Upload media lên R2 bằng `boto3`, lưu URL vào `media_urls` (đã sử dụng S3 Client của Node SDK)
- [x] Xoay proxy + account pool theo rate limit; retry/backoff (hỗ trợ proxy trên Client HTTP)

### Phase 5 — Deploy VPS 2GB
- [x] Tạo swap 4GB (Kịch bản setup-swap.sh)
- [x] Chặn tải image/media/font/css trong browser để tiết kiệm RAM (Đã cấu hình chặn ở Phase 3)
- [x] `systemd`/`supervisor` cho Sign Service (on-demand) + crawl workers (Đã tạo crawler.service và crawler-refresh.service)
- [x] Cron refresh cookie định kỳ; giới hạn concurrency HTTP 2–4 luồng (Đã thiết lập crawler-refresh.timer)
- [x] Giám sát RAM/OOM, log (Đã hướng dẫn cụ thể trong README.md)


### Phase 6 — App Expo hiển thị
- [x] Thêm query đọc `crawled_posts` (Supabase client sẵn có trong `lib/`)
- [x] Màn hình danh sách + chi tiết, render media từ R2
- [x] Phân trang / infinite scroll

## Backlog (chưa xếp phase)
- Dedup nâng cao (perceptual hash ảnh/video)
- Dashboard theo dõi tiến độ cào
- Multi-platform cùng lúc
