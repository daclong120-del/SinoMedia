# Roadmap — refactor-client-storage

Sáng kiến tái cấu trúc và chuẩn hóa kiến trúc lưu trữ dữ liệu phía Client (Cookies, localStorage, sessionStorage, IndexedDB) nhằm nâng cao tính bảo mật (chống XSS, phòng ngừa CSRF) và cải thiện hiệu năng (flicker-free, non-blocking main thread).

---

## 📍 Đang làm
- **Trạng thái**: Tất cả các phase của initiative đã hoàn tất! (✅ Xong)

---

## 🗺️ Các Phase Triển Khai

### ✅ Phase 1 — Tài liệu hóa Kiến trúc & Thiết kế Chi tiết
- **Mục tiêu**: Xây dựng đặc tả chi tiết cho chiến lược lưu trữ client tại `client-storage-strategy.md` và liên kết trong `architecture.md`. Định nghĩa rõ cơ chế xử lý lỗi (Safari Private fallback, CSRF Double-Submit Cookie, Zustand schema versioning).
- **Lý do**: Chốt thiết kế lý thuyết và các kịch bản biên trước khi cài đặt thư viện/viết code.
- **Kết quả**: Tài liệu thiết kế được duyệt.

### ✅ Phase 2 — Cấu hình Cookie Auth với `@supabase/ssr`
- **Mục tiêu**: Cài đặt `@supabase/ssr`, chuyển đổi cơ chế lưu token auth từ localStorage sang Cookie httpOnly (Lax, Secure). Cấu hình Middleware Next.js để tự động refresh token.
- **Lý do**: Đây là phần quan trọng nhất liên quan đến an ninh (Auth & Session).
- **Kết quả**: JWT token được bảo mật trong cookie, không còn lưu ở localStorage của Dashboard.

### ✅ Phase 3 — Quản lý UI Preferences qua Zustand Persist
- **Mục tiêu**: Cài đặt `zustand`, cấu hình store cho preferences (theme, sidebar, locale, table layout) với middleware `persist` có cấu hình `version` và `migrate` cho schema versioning. Tích hợp inline script trong `<head>` để chống flicker dark mode.
- **Lý do**: Tối ưu UX (chống nhấp nháy màn hình) và đảm bảo tính tương thích ngược của dữ liệu cũ.
- **Kết quả**: Preferences hoạt động mượt mà, tự động lưu trữ và phục hồi an toàn.

### ✅ Phase 4 — Tích hợp IndexedDB cho Draft Input lớn
- **Mục tiêu**: Cài đặt `idb-keyval` để lưu trữ các draft nhập liệu danh sách lớn (hàng trăm proxy/link). Implement debounce ghi đĩa và cơ chế try-catch fallback graceful cho Safari Private Browsing.
- **Lý do**: Tránh block main thread của browser khi làm việc với dung lượng lớn.
- **Kết quả**: Nhập liệu mượt mà, không bị giật lag, có cơ chế báo lỗi an toàn trên Safari Private.
