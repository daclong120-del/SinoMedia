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
- [x] Xác minh và đảm bảo không lỗi TypeScript (đã dry-run kiểm tra import và kiểu dữ liệu).

# 📋 TODO — Phase 3: Nâng cấp Queue Worker & Logic Crawler (Backend Worker)

- [x] Cập nhật interface `CrawlerTask` và `CrawledPostRow` trong `crawler-pipeline/src/model/storage.ts` định nghĩa trường `metadata`, `tags`, và `language`.
- [x] Cập nhật logic `queue_worker.ts` gán các cấu hình từ `task.metadata` vào các biến môi trường và cấu hình headless browser.
- [x] Tích hợp `ENABLE_GET_COMMENTS` vào logic cào của các platform crawlers (Zhihu, Bilibili, Kuaishou, Tieba, v.v.).
- [x] Tích hợp kế thừa `tags` và `language` từ `CURRENT_TASK_TAGS` và `CURRENT_TASK_LANGUAGE` trong `supabase_writer.ts` khi upsert bài viết.

# 📋 TODO — Phase 4: Kiểm thử & Nghiệm thu

- [ ] Tạo thử task cào có cấu hình đầy đủ qua Dashboard để kiểm tra API Payload.
- [ ] Khởi động Backend Worker, xác nhận claim task nhận đúng cấu hình `metadata`.
- [ ] Xác nhận bài viết cào về lưu vào database được kế thừa đầy đủ tags và ngôn ngữ của task.
