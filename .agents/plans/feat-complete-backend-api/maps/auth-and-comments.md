# 🌳 Detail Map — Auth & Comments Integration

- Tích hợp Auth & Comments
  - ├ Đăng nhập thật (login-form.tsx)  [quyết định: dùng supabase.auth.signInWithPassword] 🔄
      - ├ Xử lý lỗi từ Supabase (Email/Password sai, chưa kích hoạt) ⏳
      - ├ Redirect URL sau khi login thành công ⏳
  - ├ Đăng ký thật (sign-up-form.tsx)  [quyết định: dùng supabase.auth.signUp] 🔄
      - ├ Giữ nguyên Turnstile simulator widget ⏳
      - ├ Đồng bộ sinh profile trên database ⏳
  - ├ Đăng xuất thật (Header.tsx)  [quyết định: dùng supabase.auth.signOut] ⏳
  - ├ Hiển thị bình luận thật (CreativeDetailView.tsx)  [quyết định: dùng fetchComments] 🔄
      - ├ Gọi API bất đồng bộ (useEffect) dựa trên postId ⏳
      - ├ Hiển thị loading/empty state khi tải bình luận ⏳
      - ├ Render bình luận phân cấp (parent vs child) ⏳
