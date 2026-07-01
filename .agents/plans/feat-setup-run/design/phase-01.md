# Design — Phase 01: Cài đặt môi trường và khởi động trang web

## Mục tiêu (người dùng được gì)
- Cài đặt đầy đủ môi trường phát triển của dự án (Node.js dependencies).
- Sao chép và cấu hình các file môi trường mẫu.
- Khởi động thành công Expo development server ở chế độ Web để người dùng kiểm tra giao diện.

## Hành vi / use case
- Người dùng chạy lệnh khởi động ứng dụng Expo Web và trình duyệt tự động mở hoặc hiển thị địa chỉ local (`http://localhost:8081`).
- Các tính năng đăng nhập/đăng ký/AI Edge Functions yêu cầu Supabase hoạt động.

## Hướng kỹ thuật đã chọn (+ vì sao)
- **Chuẩn bị file môi trường**: Sao chép `.env.example` -> `.env` và `supabase/.env.local.example` -> `supabase/.env.local`.
- **Cài đặt dependencies**: Chạy `npm install`.
- **Khởi chạy ứng dụng**: Khởi chạy qua `npm run web` (hoặc `npx expo start --web`).
- **Xử lý Supabase**: Vì Docker không hoạt động trên máy (do Docker daemon chưa chạy), chúng tôi sẽ khuyến nghị các phương án giải quyết cho Supabase (bật Docker hoặc dùng hosted Supabase) nhưng sẽ ưu tiên khởi chạy Expo Web trước để người dùng thấy giao diện ứng dụng.

## Các bước thực thi
1. Sao chép `.env.example` thành `.env`.
2. Sao chép `supabase/.env.local.example` thành `supabase/.env.local`.
3. Chạy `npm install` để cài đặt dependencies.
4. Hỏi người dùng về hướng chạy Supabase (Bật Docker để chạy local, dùng hosted Supabase, hay chỉ chạy Expo Web trước).
5. Khởi chạy server qua `npm run web`.

## Edge case / rủi ro
- Peer dependency mismatch với Node 24: dùng `--legacy-peer-deps` nếu npm install gặp lỗi.
- Docker daemon không chạy: Supabase CLI sẽ không khởi động được nếu chọn phương án chạy local. Chúng ta sẽ hướng dẫn chi tiết cách xử lý.
