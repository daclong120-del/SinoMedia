# Map: refactor-auth-layer - Auth Foundation

## [x] Auth Service (`lib/services/auth.service.ts`)
- [x] à, nghĩa là: Cần export static class `AuthService` chạy trên môi trường Server.
- [x] à, nghĩa là: `AuthService.login` thực hiện ping `NEXT_PUBLIC_SUPABASE_URL` với timeout `1.2s` để nhận diện offline.
- [x] à, nghĩa là: Nếu offline hoặc email `admin@sinomedia.vn` mật khẩu `12345678` -> bypass sang mock mode.
- [x] à, nghĩa là: Nếu online -> gọi `supabase.auth.signInWithPassword`.
- [x] à, nghĩa là: `AuthService.signUp` gọi trực tiếp `supabase.auth.signUp` qua server-client.

## [x] Auth Actions (`lib/actions/auth.actions.ts`)
- [x] à, nghĩa là: Cần `"use server"` directive ở đầu file.
- [x] à, nghĩa là: `loginAction` set cookies `sb-mock-session` và `sb-mock-user` qua `cookies()` nếu là mock mode.
- [x] à, nghĩa là: Trả về Object dạng `{ success: boolean, error?: string, ... }` để Client Component hiển thị thông báo lỗi.
