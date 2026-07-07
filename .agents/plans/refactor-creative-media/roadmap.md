# Roadmap — Refactor Creative Media Luồng Media

Initiative: `refactor-creative-media`
Trạng thái: ✅ xong
Tiến độ: 5/5 phase

## 📍 Đang làm
Đã hoàn thành toàn bộ các phase của initiative.

## Danh sách Phase

- ✅ **Phase 1: DB Migration, Type Generation & Dashboard Service Refactor**
  - **Mục tiêu:** Cập nhật schema database (migration mới), generate types local, refactor data mapper `mapPostToCreativeAd` áp dụng helper `resolveMediaUrl` và logic đoán explicit `media_type`.
  - **Kết quả:** Đã hoàn thành. Database schema, TypeScript types và service mapper đã được refactor thành công.
- ✅ **Phase 2: Dashboard UI Components & Demo Data Backfill**
  - **Mục tiêu:** Refactor logic render của `CreativeDetailView.tsx` và `CreativeCard.tsx` để render đúng video/image player, cảnh báo lỗi, tránh render sai video cho ảnh. Chạy SQL backfill cho data seed (Unsplash -> image, MP4 -> video, v.v.).
  - **Kết quả:** Đã hoàn thành. UI component hiển thị đúng media player dựa trên media type chuẩn và backfill dữ liệu seed thành công.
- ✅ **Phase 3: Crawler Pipeline Store Layer & Pilot Platforms (Douyin + Bilibili)**
  - **Mục tiêu:** Cập nhật `supabase_writer.ts` ghi nhận các trường mới. Refactor crawler platform `douyin` và `bilibili` lưu thông tin gốc (`original_media_urls`, `original_cover_url`) và normalize trạng thái media (`media_source`, `media_status`, `media_type`) theo contract mới.
  - **Kết quả:** Đã hoàn thành. Cả Douyin và Bilibili crawler đã được refactor để ghi nhận media metadata đầy đủ theo thiết kế.
- ✅ **Phase 4: Cập nhật các Platform Crawler còn lại**
  - **Mục tiêu:** Cập nhật 5 crawler platform còn lại (`xhs`, `kuaishou`, `weibo`, `tieba`, `zhihu`) sang contract media mới.
  - **Kết quả:** Đã hoàn thành. Tất cả platform crawler đều đã được cập nhật đồng bộ.
- ✅ **Phase 5: Kiểm thử & Báo cáo**
  - **Mục tiêu:** Chạy validation test (tsc, lint, build cho cả dashboard và crawler-pipeline), chạy thử nghiệm cào thực tế để nghiệm thu.
  - **Kết quả:** Đã hoàn thành. Build, lint, typecheck cho cả Dashboard Next.js và Crawler Pipeline đều vượt qua thành công mà không phát sinh lỗi.
