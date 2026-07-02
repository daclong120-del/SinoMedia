# Kế hoạch kiểm thử hệ thống Crawler Pipeline (Douyin)

Kế hoạch này phác thảo các bước thử nghiệm, dữ liệu đầu vào cần thiết, kết quả mong đợi và các lệnh để xác thực tính đúng đắn cho các tính năng đã phát triển.

---

## 1. Điều kiện tiên quyết trước khi chạy Test
Để các lệnh kiểm thử hoạt động chính xác, môi trường phải được chuẩn bị:
1. Đã cấu hình đầy đủ các biến môi trường trong file `.env` tại thư mục gốc:
   - `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` (ghi vào database).
   - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT_URL`, `R2_BUCKET_NAME` (upload media).
2. Đã chạy lệnh khởi tạo phiên đăng nhập thành công:
   ```bash
   npm run bootstrap
   ```
   (Đảm bảo cookies và msToken đã được lưu trữ trong thư mục output).

---

## 2. Các Kịch Bản Kiểm Thử Chi Tiết

### Kịch bản 1: Cào chi tiết một Video đơn lẻ (Crawl Video)
* **Lệnh chạy:**
  ```bash
  npm run crawl https://www.douyin.com/video/7401165520058862848
  ```
* **Mục tiêu kiểm thử:**
  - Giải quyết link ngắn hoặc link dài thành công.
  - Tải file video thô và ảnh bìa từ Douyin.
  - Tải lên Cloudflare R2 thành công và nhận về các URL công khai.
  - Lưu thông tin tác giả vào bảng `crawled_authors`.
  - Lưu thông tin video và mảng link media vào bảng `crawled_posts`.
* **Kết quả mong đợi:**
  - Terminal in ra thông báo quá trình tải và upload hoàn tất thành công.
  - Kiểm tra bảng `crawled_posts` trên Supabase xuất hiện 1 bản ghi mới có `platform_id` trùng với ID video trên.
  - Kiểm tra bảng `crawled_authors` xuất hiện 1 tác giả tương ứng.

### Kịch bản 2: Cào danh sách video của một Kênh sáng tạo (Creator Videos)
* **Lệnh chạy:**
  ```bash
  # Thiết lập giới hạn cào thử nghiệm (ví dụ 5 bài viết) bằng biến môi trường
  $env:CREATOR_MAX_POSTS=5
  npm run creator https://www.douyin.com/user/MS4wLjABAAAA-exampleUserSecUid
  ```
* **Mục tiêu kiểm thử:**
  - Giải quyết link kênh thành `sec_user_id`.
  - Phân trang qua API `aweme/post/` dùng con trỏ `max_cursor`.
  - Re-fetch thông tin chi tiết nếu dữ liệu danh sách bị thiếu link tải media.
  - Không ghi trùng lặp dữ liệu tác giả/bài đăng khi chạy lại nhiều lần.
* **Kết quả mong đợi:**
  - Cào đúng số lượng bài viết giới hạn (5 bài).
  - Bảng `crawled_posts` chứa đủ 5 bài đăng liên kết với cùng 1 `author_id` (UUID).

### Kịch bản 3: Cào danh sách video theo Từ khóa tìm kiếm (Search Videos)
* **Lệnh chạy:**
  ```bash
  npm run search "nấu ăn" 5
  ```
* **Mục tiêu kiểm thử:**
  - Gửi request đến API tìm kiếm không cần chữ ký `a_bogus`.
  - Phân trang chính xác bằng tham số `search_id` nhận được từ phản hồi trước.
  - Kích hoạt cơ chế re-fetch tự động để lấy link media cho các kết quả tìm kiếm thô.
* **Kết quả mong đợi:**
  - Terminal hiển thị thông tin phân trang tìm kiếm.
  - Đầy đủ 5 video tìm kiếm được tải chi tiết, upload R2 và ghi nhận thành công trong Supabase.

### Kịch bản 4: Cào bình luận của video (Comments & Sub-comments)
* **Lệnh chạy:**
  ```bash
  npm run comments 7401165520058862848 15 true
  ```
* **Mục tiêu kiểm thử:**
  - Tìm kiếm UUID của bài viết từ bảng `crawled_posts`.
  - Lấy danh sách bình luận cấp 1 bằng API `/comment/list/` (có ký `a_bogus`).
  - Lấy các bình luận con cấp 2 nếu có `reply_comment_total > 0`.
  - Map thông tin bình luận và upsert vào bảng `crawled_comments`.
* **Kết quả mong đợi:**
  - Lưu thành công tối đa 15 bình luận bao gồm cả bình luận con.
  - Bảng `crawled_comments` có các bản ghi chứa đúng `post_id` (UUID liên kết) và `parent_cid` cho bình luận con.

### Kịch bản 5: Kiểm tra kiểu dữ liệu biên dịch (Type Verification)
* **Lệnh chạy:**
  ```bash
  npx tsc --noEmit
  ```
* **Kết quả mong đợi:**
  - Trình biên dịch TypeScript chạy hoàn tất và không phát hiện bất kỳ lỗi cú pháp hay kiểu dữ liệu nào.

---

## 3. Đề xuất tạo file kịch bản chạy tự động (Test Script)
Để kiểm thử nhanh gọn mà không cần chạy thủ công từng dòng lệnh, chúng tôi đề xuất tạo một file script kiểm thử nhanh `scratch/run_quick_test.ts` để gọi trực tiếp các API nội bộ và xác minh dữ liệu trong DB.
*(Vui lòng phản hồi để được cấp phép tạo file test tự động và chạy thử nghiệm)*
