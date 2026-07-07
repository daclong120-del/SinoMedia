# Roadmap refactor-frontend-supabase

Mục tiêu: Khóa lại kiến trúc Dashboard Next.js 16 ↔ Supabase theo mô hình Server Component → Service → Repository → Supabase server client; browser client chỉ dùng cho Realtime.

## 📍 Đang làm
- Không có (Đã hoàn thành toàn bộ lộ trình refactor)

## Danh sách các Phase
- ✅ **Phase 1** — Sửa nền TypeScript/Supabase types (Encoding `supabase.ts` & alias types) (Đã xong)
- ✅ **Phase 2** — Type hóa repository layer (post, author, task, proxy, audit, v.v.) (Đã xong)
- ✅ **Phase 3** — Type hóa service layer và mapper (`creative.service`, `dashboard.service`) (Đã xong)
- ✅ **Phase 4** — Khóa boundary Server Component vs Client Component (Tách biệt các trang creative) (Đã xong)
- ✅ **Phase 5** — Xử lý React lint `set-state-in-effect` (Search, new, posts, proxies, Header, Sidebar) (Đã xong)
- ✅ **Phase 6** — Rà API routes và server actions (creative api routes) (Đã xong)
- ✅ **Phase 7** — Dọn utility/client storage typing (utils, debounce, storage-helper, middleware) (Đã xong)
- ✅ **Phase 8** — Kiểm thử thủ công sau refactor (`tsc --noEmit`, `npm run lint`, và build kiểm thử) (Đã xong)
