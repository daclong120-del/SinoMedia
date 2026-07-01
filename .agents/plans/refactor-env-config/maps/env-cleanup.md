# 🌳 Detail Map — env-cleanup

- Chuẩn hóa cấu hình môi trường phát triển (env)
  - └ Sửa đổi root `.env.example` [quyết định: chỉ giữ biến EXPO_PUBLIC_] ✅
    - └ Loại bỏ cấu hình crawler (MySQL, Redis, MongoDB, Proxy, Captcha...) ✅
    - └ Giữ cấu hình Supabase URL & Anon Key ✅
  - └ Sửa đổi root `.env` [quyết định: khớp .env.example và điền Supabase URL thật] ✅
    - └ Nhập URL: `https://ejwqyycoycyzuxseecck.supabase.co` ✅
    - └ Nhập Anon Key placeholder ✅
  - └ Sửa đổi `supabase/.env.local.example` [quyết định: cấu hình Edge Function với OpenAI + R2] ✅
    - └ Giữ `OPENAI_API_KEY` ✅
    - └ Thêm các biến Cloudflare R2 ✅
  - └ Sửa đổi `supabase/.env.local` [quyết định: điền thông tin R2 thật từ API/api.txt] ✅
    - └ Điền R2 credentials từ `API/api.txt` ✅
    - └ Điền OpenAI API key placeholder ✅
