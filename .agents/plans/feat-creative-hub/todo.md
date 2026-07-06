# 📋 TODO — Phase 1: Xây dựng Database Views & API Endpoints

- [x] Tạo file migration và đánh các index B-Tree, GIN, và functional index trên bảng `crawled_posts`.
- [x] Thiết kế API Route `/api/creative/search` hỗ trợ tìm kiếm text search, lọc multi-platform.
- [x] Thiết kế API Route `/api/creative/trending` lấy danh sách BXH theo kỳ (7 ngày, 30 ngày, 90 ngày).
- [x] Thiết kế API Route `/api/creative/growth` tính delta tăng trưởng tương tác và mock rates.
- [x] Thiết kế API Route `/api/creative/advertisers` và `/api/creative/advertisers/[id]` tổng hợp thống kê số bài đăng và tương tác từ `crawled_authors` tối ưu qua in-memory map aggregations.

# 📋 TODO — Phase 2: Tích hợp Router & Sidebar Navigation

- [x] Cập nhật `NAV_GROUPS` trong `dashboard/components/Sidebar.tsx` đăng ký group "Creative Hub" (đã tích hợp sẵn).
- [x] Thêm breadcrumb labels vào `ROUTE_LABELS` trong `dashboard/components/Header.tsx` (đã tích hợp sẵn).
- [x] Tạo cấu trúc file pages tương ứng trong thư mục `dashboard/app/(main)/dash/creative/` (đã tích hợp sẵn).
- [x] Refactor 5 API functions (`getCreativeAdvertisers`, `getCreativeAds`, `getCreativeAdById`, `getCreativeAdvertiserById`, `getSimilarCreatives`) trong `dashboard/lib/api.ts` để gọi API Route Handlers mới.

# 📋 TODO — Phase 3: Xây dựng Trang Tìm Kiếm & Chi Tiết Creative (Core)

- [x] Phát triển component `<FilterBar>` và Card hiển thị Creative (đã được xây dựng đồng bộ).
- [x] Hoàn thiện giao diện trang tìm kiếm `/dash/creative/search` kết nối với API `/api/creative/search` thật.
- [x] Xây dựng trình phát video/ảnh HTML5 tại trang `/dash/creative/[id]` (được tích hợp trong `CreativeDetailView`).
- [x] Hiển thị thông số tương tác (views, likes, shares) và các thẻ tag liên quan từ database thật.

# 📋 TODO — Phase 4: Giao diện BXH & Lịch Tiếp Thị

- [x] Render biểu đồ Sparkline nhỏ trên bảng xếp hạng `trending` và `growth` (đã tích hợp với dữ liệu thật).
- [x] Xây dựng giao diện xem Lịch tiếp thị `/dash/creative/calendar` sử dụng grid tháng, liên kết với API.

# 📋 TODO — Phase 5: Giao diện Phân tích Advertiser

- [x] Xây dựng bảng hiển thị danh sách advertisers `/dash/creative/advertisers` (nối API thật).
- [x] Xây dựng trang hồ sơ chi tiết `/dash/creative/advertisers/[id]` (hiển thị biểu đồ & creatives của advertiser từ API).

# 📋 TODO — Phase 6: Kiểm thử & Nghiệm thu

- [x] Kiểm thử responsive trên các màn hình mobile/tablet (sử dụng Tailwind và flex/grid layouts linh hoạt).
- [x] Tối ưu hóa API queries, đánh chỉ mục (indexes) đã chuẩn bị xong ở Phase 1.
