# 📍 STATE — expo-supabase-ai-template   (cập nhật: 2026-07-01)

## Đang active
- Initiative: feat-crawler-pipeline
- Phase: Phase 4 — HTTP crawl workers + ghi Supabase & upload R2
- Item: Brainstorm & thiết kế chi tiết luồng cào HTTP + upload R2 + ghi Supabase
- Bước kế: Hỏi các câu hỏi thiết kế của Phase 4 và lên kế hoạch triển khai cụ thể

## ❓ Câu hỏi mở / chờ người dùng (Đã thống nhất giả định mặc định)
- **Nền tảng đích:** TikTok / Douyin (sẽ sử dụng các thư viện signature tương ứng ở Phase 3).
- **Vị trí repo crawler:** Sử dụng repo `D:\Python\socialpeta-crawl` đã có sẵn trong workspace.
- **Nội dung cào:** Cho phép đọc công khai (Anon read qua RLS ở Phase 2, chỉ crawler dùng `service_role` mới được quyền ghi).
- **Rotate R2/Supabase key:** Xác nhận người dùng sẽ tự thực hiện trên dashboard của Cloudflare/Supabase.

## Ghi chú nhanh
- Plan `feat-crawler-pipeline` (6 phase) đã lập chi tiết trong `.agents/plans/feat-crawler-pipeline/` để bàn giao cho AI khác triển khai.
- Kiến trúc lai CloakBrowser + HTTP: xem `.agents/docs/crawler-hybrid-architecture.md`.
- Điểm gặp nhau của crawler (Python, VPS 2GB) và app Expo là Supabase DB + Cloudflare R2 — crawler GHI, app ĐỌC.
- ⚠️ `api.txt` ở root đang chứa secret R2/Supabase plaintext (chưa bị commit git) — Phase 1 xử lý.
