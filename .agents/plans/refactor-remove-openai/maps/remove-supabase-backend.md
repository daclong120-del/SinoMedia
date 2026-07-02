# Map — Dọn dẹp Edge Function và cấu hình Supabase Backend

## Deliverables & Tasks

- [x] Gỡ Edge Function `openai` ✅
  - à, nghĩa là xóa thư mục `supabase/functions/openai/` hoàn toàn.
- [x] Gỡ cấu hình trong `supabase/config.toml` ✅
  - à, nghĩa là xóa block `[functions.openai]` và cài đặt `openai_api_key`.
- [x] Gỡ biến môi trường `OPENAI_API_KEY` ✅
  - à, nghĩa là xóa khỏi `supabase/.env.local` và `supabase/.env.local.example`.
- [x] Cập nhật comment ví dụ trong `lib/supabase.ts` ✅
  - à, nghĩa là sửa comment ở dòng 66-67 đổi hàm demo từ `openai` thành hàm trung lập khác (ví dụ: `hello`).
