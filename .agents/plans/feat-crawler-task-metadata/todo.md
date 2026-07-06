# 📋 TODO — Phase 1: Database Migration & Schema Update

- [x] Tạo file SQL migration mới tại `supabase/migrations/20260703090510_add_task_metadata.sql`.
- [x] Thêm câu lệnh `ALTER TABLE public.crawler_tasks ADD COLUMN metadata...` vào file migration.
- [x] Thêm câu lệnh `ALTER TABLE public.crawled_posts ADD COLUMN tags...` và `language` vào file migration.
- [x] Cập nhật định nghĩa hàm `create_crawler_tasks` để hỗ trợ trích xuất và lưu cột `metadata`.

# 📋 TODO — Phase 2: Nâng cấp Giao diện Web (Frontend Modal & Task UI)

- [x] Tạo mới React component `TagInput.tsx` tại `dashboard/components/dashboard/TagInput.tsx`.
- [x] Thêm các state cục bộ lưu cấu hình trong `dashboard/app/(main)/dash/tasks/page.tsx` (`newTags`, `newLanguage`, `crawlComments`, `crawlSubComments`, `headlessMode`, `uploadR2`).
- [x] Tích hợp component `TagInput` và ô cấu hình ngôn ngữ/checkboxes chạy vào trong Modal tạo task của `page.tsx`.
- [x] Ghép trường `metadata` chứa các cấu hình mới vào payload của `createTasksBulk`.
- [x] Reset tất cả các state cấu hình khi submit thành công hoặc đóng Modal.
- [x] Thêm cột `Cấu hình & Nhãn` vào bảng danh sách nhiệm vụ, render các badge cấu hình (`headless`, `comments`, `lang`) và tags dạng `#tag`.
- [ ] Chạy static check để đảm bảo không lỗi TypeScript.
