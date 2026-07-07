# 📋 Checklist — feat-creative-media-cache

- [x] **Phase 1 — Test và xác minh tải video R2 qua CLI**
  - [x] Chạy cào thử 1-3 video Bilibili với cấu hình R2 enabled qua CLI
  - [x] Kiểm tra DB xem các cột `media_source`, `media_status`, `media_urls`, và `cover_url` có lưu đúng relative keys R2 không
  - [x] Mở Dashboard kiểm tra xem video detail có phát mượt mà qua URL R2 được phân giải đúng không
- [x] **Phase 2 — Triển khai Command `cache_media` ở Crawler-Pipeline**
  - [x] Thêm command `cache_media` và logic xử lý tải/upload R2 tương ứng trong `crawler-pipeline/src/queue_worker.ts`
  - [x] Tạo unit test / script chạy thử task `cache_media` qua database trigger
- [x] **Phase 3 — Tích hợp nút "Cache media" trên Dashboard UI**
  - [x] Thêm nút "Cache media" trên `CreativeDetailView` của Dashboard
  - [x] Sửa lỗi build & type của Dashboard (`CreativeDetailView.tsx`, `types/index.ts`, `crawler.service.ts`)
  - [x] Fix worker "Success giả" ở crawler-pipeline (`queue_worker.ts`)
  - [x] Thêm cơ chế Dedupe Task trước khi tạo task cache
  - [x] Chạy lại Verification (Build, Lint, Test)
