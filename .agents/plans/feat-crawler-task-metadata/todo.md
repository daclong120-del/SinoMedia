# 📋 TODO — Phase 1: Database Migration & Schema Update

- [x] Tạo file SQL migration mới tại `supabase/migrations/20260703090510_add_task_metadata.sql`.
- [x] Thêm câu lệnh `ALTER TABLE public.crawler_tasks ADD COLUMN metadata...` vào file migration.
- [x] Thêm câu lệnh `ALTER TABLE public.crawled_posts ADD COLUMN tags...` và `language` vào file migration.
- [x] Cập nhật định nghĩa hàm `create_crawler_tasks` để hỗ trợ trích xuất và lưu cột `metadata`.
