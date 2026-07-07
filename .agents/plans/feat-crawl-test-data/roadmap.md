# 🗺️ Roadmap — feat-crawl-test-data

Initiative này thực hiện cào 50 bài viết/video từ Bilibili và nạp vào database Supabase của dự án SinoMedia phục vụ cho việc kiểm thử dữ liệu dashboard (Bỏ qua Douyin do thiếu tài khoản).

## 📍 Đang làm
- Phase 2 — Cào và nạp 50 dữ liệu từ Bilibili -> 🔄 Đang chuẩn bị chạy lệnh cào hàng loạt

## 📋 Danh sách các Phase

### ✅ Phase 1 — Khởi chạy thử nghiệm (Dry-run) & Kiểm tra kết nối Supabase
- **Mục tiêu**: Cào thử 1 bài viết từ Bilibili để kiểm tra tính hợp lệ của tài khoản cào và kết nối nạp dữ liệu vào bảng `crawled_posts` của Supabase.
- **Kết quả**: Đã chạy thành công cào video `BV1VCVS6PEAd` và nạp thành công vào local DB.

### 🔄 Phase 2 — Cào và nạp 50 dữ liệu từ Bilibili
- **Mục tiêu**: Thực hiện cào tìm kiếm Bilibili với từ khóa "AI", giới hạn 50 bài viết/video và nạp thành công vào database.
- **Giá trị**: Cung cấp đủ dữ liệu test cho trang chủ và các trang creative.

### ⏳ Phase 3 — Kiểm định và tổng hợp kết quả (Verification)
- **Mục tiêu**: Thực hiện script kiểm đếm số lượng bản ghi thực tế được lưu thành công trong bảng `crawled_posts` và `crawled_authors`. Báo cáo tổng thể dữ liệu đã được nạp thành công.
