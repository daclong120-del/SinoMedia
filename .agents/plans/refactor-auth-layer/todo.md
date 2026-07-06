# TODO — refactor-auth-layer

## Phase 1: Foundation (Auth Service + Actions)
- [x] Thiết kế `lib/services/auth.service.ts`
  - [x] Thêm logic `signUp` và `login`.
  - [x] Tích hợp logic bypass offline / mock session ở server-side.
- [x] Thiết kế `lib/actions/auth.actions.ts`
  - [x] Thêm action `loginAction` và `signUpAction`.
  - [x] Xử lý cookie xác thực thông qua `next/headers`.

## Phase 2: Migration (UI Components)
- [x] Refactor `app/(auth)/login/login-form.tsx` để gọi `loginAction`.
- [x] Refactor `app/(auth)/sign-up/sign-up-form.tsx` để gọi `signUpAction`.
- [x] Loại bỏ `createClientBrowser` khỏi UI forms.
- [x] Build verification (`npm run build`).
