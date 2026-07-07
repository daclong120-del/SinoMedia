# 🗺️ Roadmap — feat-crawl-test-data

Initiative này thực hiện cào 100 bài viết/video từ mạng xã hội (50 từ Bilibili và 50 từ Douyin) và nạp vào database Supabase của dự án SinoMedia phục vụ cho việc kiểm thử dữ liệu dashboard.

## 📍 Đang làm
- Phase 1 — Khởi chạy thử nghiệm (Dry-run)

## 📋 Danh sách các Phase

### 🔄 Phase 1 — Khởi chạy thử nghiệm (Dry-run) & Kiểm tra kết nối Supabase
- **Mục tiêu**: Cào thử 1 bài viết từ mỗi nền tảng (Douyin và Bilibili) để kiểm tra tính hợp lệ của tài khoản cào, cấu hình proxy, và kết nối nạp dữ liệu vào bảng `crawled_posts` của Supabase.
- **Giá trị**: Phát hiện sớm các lỗi cấu hình credentials, kết nối mạng hoặc lỗi định dạng dữ liệu trước khi chạy cào hàng loạt.

### ⏳ Phase 2 — Cào và nạp 50 dữ liệu từ Bilibili
- **Mục tiêu**: Thực hiện cào tìm kiếm Bilibili với từ khóa "AI", giới hạn 50 bài viết/video và nạp thành công vào database.
- **Giá trị**: Hoàn thành một nửa mục tiêu dữ liệu với nền tảng ít bị block hơn để xác minh hiệu năng nạp dữ liệu.

### ⏳ Phase 3 — Cào và nạp 50 dữ liệu từ Douyin
- **Mục tiêu**: Thực hiện cào tìm kiếm Douyin với từ khóa "marketing", giới hạn 50 bài viết/video và nạp vào database.
- **Giá trị**: Hoàn thành nạp 50 dữ liệu còn lại từ nền tảng Douyin (yêu cầu xử lý cookie/bảo mật cao hơn).

### ⏳ Phase 4 — Kiểm định và tổng hợp kết quả (Verification)
- **Mục tiêu**: Thực hiện script kiểm đếm số lượng bản ghi thực tế được lưu thành công trong bảng `crawled_posts` và `crawled_authors`. Báo cáo tổng thể dữ liệu đã được nạp thành công.
- **Giá trị**: Đảm bảo chất lượng dữ liệu và tính chính xác của quá trình nạp.
