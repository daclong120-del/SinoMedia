# Overview — Refactor Creative Media

## Mục tiêu
- Sửa lỗi video detail không play trong Creative Hub.
- Giảm phụ thuộc upload R2 ngay lập tức bằng mô hình hybrid (lưu original URL làm fallback, cho phép bật/tắt upload R2 qua task metadata).
- Đồng nhất contract media URL giữa Dashboard và Crawler Pipeline.

## Phạm vi
- `dashboard`, `crawler-pipeline`, `supabase`, Cloudflare R2.

## Quyết định Thiết kế đã chốt
1. **Media URL R2:** Lưu relative path/object key trong DB (ví dụ: `douyin/awemeId/video.mp4`). Dashboard mapper prepend `EXPO_PUBLIC_R2_PUBLIC_URL` hoặc `R2_PUBLIC_URL` để sinh ra full URL.
2. **Quy ước `media_urls` theo `media_source`:**
   - `media_source = 'r2'`: `media_urls` chứa relative R2 keys.
   - `media_source = 'original'`: `media_urls` chứa full original URLs.
   - `original_media_urls`: luôn giữ full URL gốc làm fallback.
3. **Migration/Types:** Làm trên Supabase Local trước, gen types local, sau đó mới apply remote.
4. **Platform Crawler:** Cập nhật cuốn chiếu (Douyin + Bilibili trước, sau đó là các platform còn lại).
5. **On-demand cache:** Để lại Phase 2 (giai đoạn sau).
