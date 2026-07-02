# 🗺️ Bản đồ chi tiết "à, nghĩa là..." — Creator Videos (Phase A)

Bản đồ phân rã các quyết định thiết kế cho tính năng cào kênh Creator của Douyin.

- **Trích xuất `sec_user_id`**
  - 🔄 Giải quyết link rút gọn `v.douyin.com/...` trước qua `resolveShortUrl` -> trả về URL gốc chứa ID.
  - 🔄 Trích xuất phần ID từ URL thông qua biểu thức chính quy (Regex) `/user/([^/?]+)`.
  - 🔄 Hỗ trợ truyền trực tiếp `sec_user_id` (chuỗi bắt đầu bằng `MS4wLjAB` hoặc chuỗi không chứa URL/domain).

- **Profile Creator (Thông tin tác giả)**
  - 🔄 Gọi endpoint `/aweme/v1/web/user/profile/other/` để lấy profile chi tiết.
  - 🔄 Download ảnh đại diện từ `avatar_thumb` hoặc `avatar_larger` của creator.
  - 🔄 Upload ảnh đại diện lên Cloudflare R2 qua `uploadMediaToR2`.
  - 🔄 Gọi `upsertAuthor` để tạo hoặc cập nhật tác giả trong Supabase DB.

- **Danh sách video (Creator Posts)**
  - 🔄 Gọi API `/aweme/v1/web/aweme/post/` với tham số `sec_user_id` và `max_cursor` để lấy danh sách video theo trang.
  - 🔄 Đồng bộ hóa `max_cursor` (kiểu chuỗi) giữa các vòng lặp trang.
  - 🔄 Thiết lập giới hạn số bài cào tối đa thông qua biến môi trường `CREATOR_MAX_POSTS` (mặc định là vô hạn `Infinity`).

- **Xử lý từng video**
  - 🔄 Duyệt qua danh sách `aweme_list`.
  - 🔄 Kiểm tra xem `item` có đầy đủ media (`video.play_addr` hoặc `images`) không. Nếu thiếu, thực hiện re-fetch qua `/aweme/v1/web/aweme/detail/`.
  - 🔄 Gọi `persistAweme` để tải media -> upload R2 -> lưu bài đăng vào `crawled_posts` của Supabase.
  - 🔄 Bắt lỗi `try/catch` ở mức từng bài đăng để tránh lỗi một bài làm dừng toàn bộ quá trình cào kênh.
  - 🔄 Nghỉ giữa các bài đăng và các trang với thời gian `CRAWL_SLEEP_MS` (1500ms).

- **Giao diện CLI / Entry Point**
  - 🔄 Đăng ký lệnh `creator <url>` trong `src/index.ts`.
  - 🔄 Đăng ký script `"creator": "tsx src/index.ts creator"` trong `package.json`.
