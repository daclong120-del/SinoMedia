# Design — Phase 02: Cấu hình supabase edge env local

## Mục tiêu (người dùng được gì)
- Thiết lập môi trường phát triển cục bộ cho các Supabase Edge Functions.
- Tích hợp cấu hình Cloudflare R2 để Edge Functions có thể sử dụng (ví dụ: tạo Presigned URL cho việc lưu trữ media).
- Đảm bảo an toàn bảo mật, tránh lộ lọt credentials của R2 và OpenAI ra ngoài bằng cách đưa chúng vào `.env.local` (đã được gitignore).

## Hành vi / use case
- Edge Functions có thể đọc các cấu hình môi trường cục bộ thông qua `Deno.env.get()`.

## Hướng kỹ thuật đã chọn (+ vì sao)
- Sử dụng cấu trúc chuẩn của Supabase CLI: Đọc file `supabase/.env.local` khi chạy local dev server.

## Các bước thực thi
1. Tạo/Cập nhật `supabase/.env.local.example` với các biến mẫu.
2. Tạo/Cập nhật `supabase/.env.local` với các giá trị R2 thực từ `API/api.txt`.

## Edge case / rủi ro
- File `supabase/.env.local` có thể bị đẩy lên git nếu không được cấu hình gitignore chính xác. (Đã xác minh `.gitignore` của supabase chặn hoàn toàn `.env.local`).
