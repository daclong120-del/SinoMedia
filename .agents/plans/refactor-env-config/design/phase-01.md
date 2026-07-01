# Design — Phase 01: Chuẩn hóa client env config

## Mục tiêu (người dùng được gì)
- Loại bỏ hoàn toàn các cấu hình rác/dư thừa từ dự án cũ (MediaCrawler) giúp dự án sạch sẽ, chuyên nghiệp.
- Cung cấp file cấu hình mẫu `.env.example` chuẩn để nhà phát triển khác có thể thiết lập nhanh.
- Thiết lập đúng `EXPO_PUBLIC_SUPABASE_URL` kết nối tới remote Supabase.

## Hành vi / use case
- Khi chạy Expo Client, app load thành công cấu hình Supabase Client và không gặp lỗi.

## Hướng kỹ thuật đã chọn (+ vì sao)
- Chọn Phương án A: Tách riêng root `.env` cho client-side Expo variables, chỉ giữ các biến có tiền tố `EXPO_PUBLIC_`.
- Link quyết định: [decisions.md](../../../docs/decisions.md)

## Các bước thực thi
1. Sửa đổi `d:\Python\expo-supabase-ai-template\.env.example`
2. Sửa đổi `d:\Python\expo-supabase-ai-template\.env`

## Edge case / rủi ro
- Thiếu `EXPO_PUBLIC_SUPABASE_ANON_KEY` có thể gây lỗi Supabase Client. Chúng ta sẽ để placeholder cho key này và hướng dẫn người dùng cách lấy.

## Map chi tiết: maps/env-cleanup.md
