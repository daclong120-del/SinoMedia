# Walkthrough — Refactor Creative Media Luồng Media

## Thay đổi đã thực hiện

### 1. Database Schema (Supabase Migration)
- Tạo migration mới `20260707000001_creative_media_contract.sql` bổ sung các cột:
  - `media_type` (`video`, `image`, `carousel`, `unknown`)
  - `original_media_urls`, `original_cover_url`
  - `media_status` (`original_only`, `cached`, `failed`, `expired`, `unavailable`)
  - `media_source` (`original`, `r2`, `mixed`, `none`)
  - `media_error`, `media_cached_at`
- Chạy local migration reset database (`supabase db reset`).
- Seed và backfill dữ liệu demo hoàn chỉnh (Unsplash -> `image`, MP4 -> `video`).

### 2. Typescript Types & Service Layer
- Generate thành công local Typescript types trong [supabase.ts](file:///d:/Python/SinoMedia/dashboard/types/supabase.ts) (sử dụng encoding UTF-8).
- Cập nhật domain types [index.ts](file:///d:/Python/SinoMedia/dashboard/types/index.ts) định nghĩa chuẩn xác interface `CreativeAd`.
- Cập nhật data mapper `mapPostToCreativeAd` trong [creative.service.ts](file:///d:/Python/SinoMedia/dashboard/lib/services/creative.service.ts):
  - Tích hợp helper `resolveMediaUrl` tự động phân giải relative paths của R2 (object keys) sang full URL (đọc cấu hình từ `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL` hoặc `EXPO_PUBLIC_R2_PUBLIC_URL` làm fallback).
  - Tích hợp helper `inferMediaType` tự động suy luận loại media thông minh và chuẩn xác.

### 3. Dashboard UI Components
- Sửa [CreativeDetailView.tsx](file:///d:/Python/SinoMedia/dashboard/components/dashboard/CreativeDetailView.tsx) để render đúng trình phát video `<video>` hoặc hình ảnh `<img>` dựa trên `media_type` tường minh. Thêm cảnh báo lỗi cho các media có trạng thái `failed` hoặc `expired`. Tự động set video khởi chạy ở chế độ `muted` an toàn để tránh bị browser chặn phát.
- Sửa [CreativeCard.tsx](file:///d:/Python/SinoMedia/dashboard/components/dashboard/CreativeCard.tsx) để preview video chính xác hơn và tự động fallback sang cover placeholder nếu media có trạng thái `failed`.

### 4. Crawler Pipeline
- Cập nhật [supabase_writer.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/store/supabase_writer.ts) (hàm `upsertPost`, `upsertPosts`) lưu trữ toàn bộ các cột metadata mới của media.
- Refactor đồng bộ toàn bộ 7/7 crawler platforms để ghi nhận đầy đủ original media, cover URLs, trạng thái cache R2, và media type:
  - `douyin`, `bilibili` (Phase 3 pilot)
  - `xhs`, `kuaishou`, `weibo` (Phase 4 hybrid R2)
  - `tieba`, `zhihu` (Phase 4 text-only/images)

## Kết quả Kiểm thử (Validation Results)

- **Typecheck Dashboard:** `npx tsc --noEmit` pass thành công 100%.
- **Lint Dashboard:** `npm run lint` pass thành công 100%.
- **Build Dashboard:** `npm run build` pass thành công 100%, Next.js compile Turbopack và optimize bundle trơn tru.
- **Typecheck Crawler:** `npx tsc --noEmit` pass thành công 100%.
- **Database query verification:** Query kiểm tra dữ liệu demo cho thấy các cột được backfill đúng loại media, không có hiện tượng map nhầm ảnh Unsplash sang video.
