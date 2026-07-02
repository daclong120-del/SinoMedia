# 📍 STATE — expo-supabase-ai-template   (cập nhật: 2026-07-02)

## Đang active
- Initiative: `refactor-migrate-platforms` 🔄 (Đang thực hiện Phase 1 — Bilibili Crawler)
- `refactor-remove-openai` ✅ — Đã loại bỏ hoàn toàn OpenAI khỏi Client, Backend, và Tài liệu.
- `refactor-project-structure` ✅ — đã tạo bộ khung: `base/`, `config/`, `constant/`, `proxy/`, `utils/` (crawler) + `hooks/`, `services/`, `types/` (Expo app).

## ❓ Câu hỏi mở / chờ người dùng (Đã thống nhất giả định mặc định)
- **Nền tảng đích:** TikTok / Douyin (sẽ sử dụng các thư viện signature tương ứng ở Phase 3).
- **Vị trí repo crawler:** Sử dụng repo `D:\Python\socialpeta-crawl` đã có sẵn trong workspace.
- **Nội dung cào:** Cho phép đọc công khai (Anon read qua RLS ở Phase 2, chỉ crawler dùng `service_role` mới được quyền ghi).
- **Rotate R2/Supabase key:** Xác nhận người dùng sẽ tự thực hiện trên dashboard của Cloudflare/Supabase.

## Ghi chú nhanh
- **Mục tiêu hiện tại: rewrite các tính năng MediaCrawler (Python) sang TS trong `crawler-pipeline/`.** Đã có: cào 1 video (detail) + login + sign + R2 + Supabase writer. Cần port: creator videos, search theo từ khóa, comments. Plan chi tiết: `.agents/plans/feat-crawler-ts-features/`.
- Nguồn logic gốc để đối chiếu (⛔ CẤM sửa): `D:\Python\ChinaMediaCrawler\_mediaCrawler\media_platform\douyin\`.
- Bản TS đã chọn đúng đồ nghề: `impit` (= curl_cffi, spoof JA3), Playwright (= CloakBrowser sinh sign), `a_bogus.js` đã port.
- Plan `feat-crawler-pipeline` (6 phase) đã lập chi tiết trong `.agents/plans/feat-crawler-pipeline/` để bàn giao cho AI khác triển khai.
- Kiến trúc lai CloakBrowser + HTTP: xem `.agents/docs/crawler-hybrid-architecture.md`.
- Điểm gặp nhau của crawler (Python, VPS 2GB) và app Expo là Supabase DB + Cloudflare R2 — crawler GHI, app ĐỌC.
- ⚠️ `api.txt` ở root đang chứa secret R2/Supabase plaintext (chưa bị commit git) — Phase 1 xử lý.
