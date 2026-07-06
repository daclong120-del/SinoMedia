# 🗺️ ROADMAP — feat-crawler-task-metadata (cập nhật: 2026-07-03)

## 📍 Đang làm
- Phase 2: Nâng cấp Giao diện Web (Frontend Modal & Task UI)

## Phase
- ✅ Phase 1 — Nâng cấp Cấu trúc Database (Supabase Migration & Schema Update)
  - Viết file migration SQL để thêm cột `metadata` vào bảng `crawler_tasks`.
  - Thêm cột `tags` (text[]) và `language` (text) vào bảng `crawled_posts` để hỗ trợ lọc nâng cao.
  - Cập nhật hàm RPC `create_crawler_tasks` để tiếp nhận và lưu trữ trường `metadata` từ dữ liệu gửi lên.
- ⏳ Phase 2 — Nâng cấp Giao diện Web (Frontend Modal & Task UI)
  - Cập nhật components trong `dashboard/app/(main)/dash/tasks/page.tsx`.
  - Tích hợp thêm các trường nhập liệu trong modal tạo nhiệm vụ: tags (nhập chuỗi hoặc gắn nhãn), ngôn ngữ (dropdown select), và checkboxes cấu hình chạy (crawl comments, crawl sub-comments, headless mode).
  - Tích hợp các trường cấu hình này vào payload gửi đi của `createTasksBulk` và API supabase.
  - Hiển thị tags và trạng thái các tùy chọn cấu hình trên danh sách Task List Table.
- ⏳ Phase 3 — Nâng cấp Queue Worker & Logic Crawler (Backend Worker)
  - Cập nhật interface `CrawlerTask` và `CrawledPostRow` trong `crawler-pipeline/src/model/storage.ts` để định nghĩa trường `metadata`, `tags`, và `language`.
  - Cập nhật logic `queue_worker.ts` để đọc các cài đặt từ `metadata` của Task và truyền các cài đặt này xuống các crawler của từng nền tảng (Douyin, Zhihu, Bilibili, v.v.).
  - Sử dụng tham số `headless` từ task metadata để thiết lập chế độ chạy trình duyệt của Puppeteer/Playwright.
  - Sử dụng tham số `crawl_comments` và `crawl_sub_comments` để quyết định xem có cào bình luận và bình luận phụ hay không.
  - Khi lưu trữ bài viết cào được (`upsertPost`/`upsertPosts`), sao chép/kế thừa `tags` và `language` từ task sang bài viết đó để hiển thị đồng bộ lên Creative Hub.
- ⏳ Phase 4 — Kiểm thử & Nghiệm thu
  - Tạo thử các task cào có cấu hình đầy đủ qua Dashboard.
  - Xác nhận worker nhận đúng cấu hình, chạy đúng chế độ headless/non-headless, và cào bình luận đúng yêu cầu.
  - Xác nhận dữ liệu bài đăng được ghi vào database có đầy đủ tags và ngôn ngữ của task mẹ.
