# Thiết kế Phase 1 — Khởi chạy thử nghiệm (Dry-run)

## 🎯 Mục tiêu
Kiểm tra tính thông suốt của pipeline cào dữ liệu từ hai nền tảng Bilibili và Douyin, đồng thời xác minh quá trình nạp dữ liệu chuẩn hóa vào bảng `crawled_posts` và `crawled_authors` của Supabase local.

## 🛠️ Hướng tiếp cận
Chạy trực tiếp thông qua CLI của `crawler-pipeline` để kiểm chứng và quan sát log thời gian thực:
- **Bilibili**: Cào tìm kiếm với từ khóa "AI", giới hạn 1 bài viết.
- **Douyin**: Cào tìm kiếm với từ khóa "marketing", giới hạn 1 bài viết.

## 🔍 Kế hoạch thực hiện
1. **Kiểm tra môi trường**: Xác nhận Supabase local đang chạy cổng `54321` và `crawler-pipeline/.env.local` đã được cấu hình đúng.
2. **Khởi chạy Dry-run Bilibili**:
   ```bash
   npx tsx src/index.ts search "AI" 1 -p bilibili
   ```
3. **Khởi chạy Dry-run Douyin**:
   ```bash
   npx tsx src/index.ts search "marketing" 1 -p douyin
   ```
4. **Xác minh kết quả**:
   Truy cập cơ sở dữ liệu local kiểm tra số lượng bản ghi mới tăng lên trong:
   - `public.crawled_posts`
   - `public.crawled_authors`

## ⚠️ Rủi ro & Giải pháp phòng ngừa
- **Lỗi Block R2**: R2 upload có thể bị block hoặc lỗi xác thực cloud.
  - *Giải pháp*: Code trong `bilibili/core.ts` đã có catch block cho R2, tự động fallback về link gốc và ghi log cảnh báo mà không làm crash luồng cào.
- **Lỗi Cookie Douyin**: Douyin yêu cầu cookie thật để gọi API. Cookie seed ban đầu (`dummy_cookie_content`) có khả năng cao bị từ chối.
  - *Giải pháp*: Lỗi này là dự kiến để kiểm tra tính năng ghi nhận lỗi của crawler. Nếu bị từ chối, crawler sẽ cập nhật trạng thái lỗi chi tiết.
