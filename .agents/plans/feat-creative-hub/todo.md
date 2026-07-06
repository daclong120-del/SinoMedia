# 📋 TODO — Phase 1: Xây dựng Database Views & API Endpoints

- [x] Tạo file migration và đánh các index B-Tree, GIN, và functional index trên bảng `crawled_posts`.
- [x] Thiết kế API Route `/api/creative/search` hỗ trợ tìm kiếm text search, lọc multi-platform.
- [x] Thiết kế API Route `/api/creative/trending` lấy danh sách BXH theo kỳ (7 ngày, 30 ngày, 90 ngày).
- [x] Thiết kế API Route `/api/creative/growth` tính delta tăng trưởng tương tác và mock rates.
- [x] Thiết kế API Route `/api/creative/advertisers` và `/api/creative/advertisers/[id]` tổng hợp thống kê số bài đăng và tương tác từ `crawled_authors` tối ưu qua in-memory map aggregations.

# 📋 TODO — Phase 2: Tích hợp Router & Sidebar Navigation

- [ ] Cập nhật `NAV_GROUPS` trong `dashboard/components/Sidebar.tsx` đăng ký group "Creative Hub".
- [ ] Thêm breadcrumb labels vào `ROUTE_LABELS` trong `dashboard/components/Header.tsx`.
- [ ] Tạo cấu trúc file pages tương ứng trong thư mục `dashboard/app/(main)/dash/creative/`.

# 📋 TODO — Phase 3: Xây dựng Trang Tìm Kiếm & Chi Tiết Creative (Core)

- [ ] Phát triển component `<FilterBar>` và Card hiển thị Creative.
- [ ] Hoàn thiện giao diện trang tìm kiếm `/dash/creative/search`.
- [ ] Xây dựng trình phát video/ảnh HTML5 tại trang `/dash/creative/[id]`.
- [ ] Hiển thị thông số tương tác (views, likes, shares) và các thẻ tag liên quan.

# 📋 TODO — Phase 4: Giao diện BXH & Lịch Tiếp Thị

- [ ] Render biểu đồ Sparkline nhỏ trên bảng xếp hạng `trending` và `growth`.
- [ ] Xây dựng giao diện xem Lịch tiếp thị `/dash/creative/calendar` sử dụng grid tháng.

# 📋 TODO — Phase 5: Giao diện Phân tích Advertiser

- [ ] Xây dựng bảng hiển thị danh sách advertisers `/dash/creative/advertisers`.
- [ ] Xây dựng trang hồ sơ chi tiết `/dash/creative/advertisers/[id]`.

# 📋 TODO — Phase 6: Kiểm thử & Nghiệm thu

- [ ] Kiểm thử responsive trên các màn hình mobile/tablet.
- [ ] Tối ưu hóa API queries, đánh chỉ mục (indexes) nếu cần thiết để trang load dưới 1 giây.
