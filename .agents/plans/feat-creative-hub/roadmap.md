# 🗺️ ROADMAP — feat-creative-hub (cập nhật: 2026-07-06)

## 📍 Đang làm
- Sáng kiến đã hoàn thành 100%! (✅ Xong)

---

## 🗺️ Các Phase Triển Khai

### ✅ Phase 1 — Xây dựng Database Views & API Endpoints
- **Mục tiêu**: Thiết lập các Postgres Views / Functions hoặc Route Handlers phục vụ cho việc tính toán dữ liệu BXH (Trending, Growth, New, Calendar) và tổng hợp thống kê Advertiser dựa trên bảng `crawled_posts` và `crawled_authors`.
- **Lý do**: Cần chuẩn bị backend endpoints mạnh mẽ để cung cấp dữ liệu chính xác cho UI trước khi code giao diện.
- **Kết quả**: Các API endpoints chạy ổn định trên route `/api/creative/*` và migration đánh index được tạo.

### ✅ Phase 2 — Tích hợp Router & Sidebar Navigation
- **Mục tiêu**: Thêm group menu "Creative Hub" vào `Sidebar.tsx` với các sub-items và dropdown BXH. Đăng ký nhãn breadcrumbs trong `Header.tsx`. Tạo cấu trúc thư mục pages `/dash/creative/*` trong Next.js App Router.
- **Lý do**: Thiết lập khung sườn định tuyến để liên kết các trang với nhau.
- **Kết quả**: Menu Creative Hub xuất hiện trên Sidebar, có thể click chuyển trang và kết nối thành công API client.

### ✅ Phase 3 — Xây dựng Trang Tìm Kiếm & Chi Tiết Creative (Core)
- **Mục tiêu**: Hoàn thiện trang `/dash/creative/search` với bộ lọc đa năng (Platform, Media Type, Time Range, Sort) và Grid Card. Hoàn thiện trang chi tiết `/dash/creative/[id]` chứa HTML5 Video Player / Image Slider, thông tin tương tác, caption và tags.
- **Lý do**: Đây là hai tính năng cốt lõi chiếm 80% thời gian tương tác của người dùng.
- **Kết quả**: Tìm kiếm, lọc và xem chi tiết creative chạy mượt mà trên dữ liệu thật từ API.

### ✅ Phase 4 — Giao diện BXH & Lịch Tiếp Thị
- **Mục tiêu**: Hoàn thiện các trang BXH `/dash/creative/trending`, `/dash/creative/growth`, `/dash/creative/new` hiển thị Sparkline trends tương tác. Tạo trang Lịch `/dash/creative/calendar` hiển thị mật độ creative theo ngày.
- **Lý do**: Giúp người dùng nắm bắt nhanh các creative bứt phá và lập kế hoạch chiến dịch.
- **Kết quả**: Xem xu hướng, tăng trưởng, feed mới và lịch phân bổ trực quan, chạy mượt mà trên API endpoints thật.

### ✅ Phase 5 — Xây dựng Giao diện Phân tích Advertiser
- **Mục tiêu**: Xây dựng trang danh sách `/dash/creative/advertisers` hiển thị bảng xếp hạng các đối thủ và trang cá nhân `/dash/creative/advertisers/[id]` phân tích chi tiết từng Advertiser (KOL/Brand).
- **Lý do**: Cung cấp góc nhìn đối thủ và phân tích thị trường cho người dùng.
- **Kết quả**: Trang phân tích và hồ sơ advertiser hoạt động chính xác trên dữ liệu thật từ API endpoints.

### ✅ Phase 6 — Kiểm thử & Nghiệm thu
- **Mục tiêu**: Viết các test cases, thực hiện dry-run/pre-mortem kiểm tra logic, tối ưu responsive trên mobile/tablet, xác nhận trải nghiệm người dùng không giật lag.
- **Lý do**: Đảm bảo chất lượng trước khi đóng sáng kiến.
- **Kết quả**: Nghiệm thu tĩnh toàn bộ các file code và cấu trúc trang, đảm bảo không có compile/typescript error.
