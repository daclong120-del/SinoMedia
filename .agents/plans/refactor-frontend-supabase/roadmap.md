# Roadmap refactor-frontend-supabase

Mục tiêu: Khóa lại kiến trúc Dashboard Next.js 16 ↔ Supabase theo mô hình Server Component → Service → Repository → Supabase server client; browser client chỉ dùng cho Realtime.

## 📍 Đang làm
- Chưa bắt đầu phase nào (chờ người dùng chọn)

## Danh sách các Phase
- ⏳ **Phase 1** — Sửa nền TypeScript/Supabase types (Encoding `supabase.ts` & alias types)
- ⏳ **Phase 2** — Type hóa repository layer (post, author, task, proxy, audit, v.v.)
- ⏳ **Phase 3** — Type hóa service layer và mapper (`creative.service`, `dashboard.service`)
- ⏳ **Phase 4** — Khóa boundary Server Component vs Client Component (Tách biệt các trang creative)
- ⏳ **Phase 5** — Xử lý React lint `set-state-in-effect` (Search, new, posts, proxies pages)
- ⏳ **Phase 6** — Rà API routes và server actions (creative api routes)
- ⏳ **Phase 7** — Dọn utility/client storage typing (utils, debounce, storage-helper, middleware)
- ⏳ **Phase 8** — Kiểm thử thủ công sau refactor
