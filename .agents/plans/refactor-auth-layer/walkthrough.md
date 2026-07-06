# Walkthrough — refactor-auth-layer

Tái cấu trúc lớp xác thực (Authentication Layer) của SinoMedia Dashboard theo kiến trúc chuẩn doanh nghiệp: **Client UI -> Server Action -> Service Layer -> Supabase Server API** đã hoàn thành 100%.

## Thay Đổi Đã Thực Hiện

### 1. Xây Dựng Lớp Xác Thực Ở Server-side (Phase 1)
- **Service Layer**: Tạo `lib/services/auth.service.ts` để gộp toàn bộ logic auth thật và cơ chế bypass/offline mock mode của local.
- **Server Actions**: Tạo `lib/actions/auth.actions.ts` dùng `"use server"` directive để làm cầu nối. Xử lý ghi mock cookies (`sb-mock-session` và `sb-mock-user`) trực tiếp ở Server thông qua `cookies()` HTTP headers.

### 2. Di Cư Và Làm Sạch UI Components (Phase 2)
- **Refactor Login Form**:
  - Loại bỏ hoàn toàn `createClientBrowser` từ UI.
  - Sửa `handleSubmit` ở `app/(auth)/login/login-form.tsx` để gọi `loginAction` Server Action.
  - Loại bỏ `AbortController`, `fetch` check endpoint phức tạp ở client side.
  - Gọi `router.refresh()` sau khi redirect sang `/dash/home` để Next.js đồng bộ cookie session mới.
- **Refactor Sign Up Form**:
  - Loại bỏ hoàn toàn `createClientBrowser` từ UI.
  - Sửa `handleSubmit` ở `app/(auth)/sign-up/sign-up-form.tsx` để gọi `signUpAction` Server Action.
  - Rút gọn code, tập trung hiển thị giao diện và validation cơ bản.
- **Refactor Sign Out (Đăng xuất)**:
  - Tạo Server Action `signOutAction` ở `lib/actions/auth.actions.ts` để xóa toàn bộ mock cookies (`sb-mock-session`, `sb-mock-user`) và gọi `supabase.auth.signOut()` phía server.
  - Cập nhật nút Đăng xuất tại `components/Header.tsx` sử dụng Server Action này và gọi `router.refresh()` để buộc Next.js refresh lại router, giúp middleware chuyển hướng về trang `/login` tức thì sau khi xóa session cookies.

---

## Kết Quả Xác Minh (Verification Results)

- **Biên dịch & Type Check**:
  - Lệnh `npm run build` chạy thành công không có bất kỳ lỗi TypeScript hay lỗi biên dịch nào.
  - Cả 28 routes được generate hoàn hảo.
- **Đăng ký & Đăng nhập**:
  - Trải nghiệm đăng ký bằng email mới (ví dụ: `admin@example.com` / `Admin123!`) chạy trơn tru, lưu account vào local storage và tự động redirect vào Dashboard sau khi set mock/real cookie thành công.
