# Design — Phase 01: Supabase Auth & Kết nối UI Bình luận

## Mục tiêu (người dùng được gì)
* Người dùng đăng nhập và đăng ký tài khoản thật thông qua dịch vụ Supabase Auth, bảo vệ các trang dashboard quản trị khỏi các truy cập trái phép.
* Người dùng có thể xem bình luận thật cào được từ các bài viết thay vì bình luận giả lập.

## Hành vi / use case
1. **Đăng nhập**: Nhập email và mật khẩu -> Gửi yêu cầu xác thực tới Supabase -> Lưu session và chuyển hướng tới `/dash/home`.
2. **Đăng ký**: Nhập email, mật khẩu, và vượt Turnstile -> Gọi Supabase Auth để tạo user.
3. **Đăng xuất**: Click Đăng xuất -> Hủy session và chuyển hướng về `/login`.
4. **Xem bình luận**: Khi mở chi tiết bài viết, gửi request lấy bình luận tương ứng từ database và hiển thị danh sách.

## Hướng kỹ thuật đã chọn (+ vì sao)
* **Supabase Client SDK**: Sử dụng trực tiếp `supabase.auth` phía client vì dự án Next.js hiện đang chạy hoàn toàn ở chế độ CSR (Client-Side Rendering) thông qua directive `"use client"`.
* **fetchComments API**: Sử dụng hàm `fetchComments` hiện có trong `lib/api.ts` để gọi database PostgREST API của Supabase, tận dụng tối đa code đã viết.

## Các bước thực thi
1. Sửa `dashboard/app/(auth)/login/login-form.tsx` để tích hợp `supabase.auth.signInWithPassword`.
2. Sửa `dashboard/app/(auth)/sign-up/sign-up-form.tsx` để tích hợp `supabase.auth.signUp`.
3. Sửa `dashboard/components/Header.tsx` để tích hợp nút Đăng xuất bằng `supabase.auth.signOut`.
4. Sửa `dashboard/components/dashboard/CreativeDetailView.tsx` để gọi `fetchComments` và render bình luận.

## Edge case / rủi ro
* **Email confirmation**: Nếu email confirmation đang bật trên Supabase console, người dùng đăng ký xong sẽ không đăng nhập ngay được mà phải kích hoạt.
* **Cookie/Session sync**: Đảm bảo đồng bộ session giữa Next.js router và Supabase Client.

## Map chi tiết: maps/auth-and-comments.md
