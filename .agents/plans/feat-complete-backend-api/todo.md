# ✅ TODO — feat-complete-backend-api

## Phase hiện tại: Toàn bộ sáng kiến đã hoàn thành! ✅

## Lịch sử lưu trữ (Đã hoàn thành)
- [x] Tích hợp Supabase Auth thật vào màn hình Đăng nhập (`login-form.tsx`)
- [x] Tích hợp Supabase Auth thật vào màn hình Đăng ký (`sign-up-form.tsx`)
- [x] Tích hợp Supabase Auth thật vào nút Đăng xuất (`Header.tsx`)
- [x] Kết nối hàm `fetchComments` từ `api.ts` vào UI chi tiết bài đăng (`posts/page.tsx`)
- [x] Tạo file migration `20260706000001_proxies_and_logs.sql`
- [x] Cập nhật API layer (`api.ts`) các hàm truy vấn DB thực tế cho Proxies và Audit Logs
- [x] Cập nhật UI `/dash/proxies` sang gọi API thật
- [x] Cập nhật UI `/dash/audit-logs` sang gọi API thật
- [x] Tạo file migration `20260706000002_settings_and_export.sql`
- [x] Cập nhật API layer (`api.ts`) các hàm cho System Settings và Export History
- [x] Cập nhật UI `/dash/settings` sang gọi API thật
- [x] Cập nhật UI `/dash/data/management` sang gọi API thật
- [x] Tạo file migration `20260706000003_creative_and_analytics.sql`
- [x] Cập nhật API layer (`api.ts`) các hàm cho Creative Hub và các câu query Analytics thực tế
- [x] Cập nhật UI `/dash/creative` sang gọi API thật
- [x] Kiểm thử biên và tối ưu hóa hiệu năng SQL (giới hạn query 7 ngày của biểu đồ cào dữ liệu)
- [x] Xác minh tích hợp đầu cuối giữa client dashboard và backend DB

## Backlog (chưa xếp phase)
- [x] Thiết kế migration cho các bảng proxies, audit_logs
- [x] Thiết kế migration cho các bảng system_settings, exported_files
- [x] Thiết kế migration cho các bảng creative_advertisers, creative_ads
