# TODO — Phase 4: Type Safety: Auto-gen types từ DB schema

## Database Types
- [x] Auto-generate `types/supabase.ts` từ Database Schema thật.
- [x] Thêm script `"types:gen"` vào `package.json` để dễ dàng cập nhật types sau này.

## Integration
- [x] Tích hợp `Database` type vào `createServerClient` trong `lib/supabase/server.ts`.
- [x] Tích hợp `Database` type vào `createBrowserClient` trong `lib/supabase/client.ts`.
- [x] Tích hợp `Database` type vào 8 Repositories.
- [x] Cập nhật các Service mappers để sử dụng DB Row types (`DbTask`, `DbAccount`, `DbLog`) thay cho `Record<string, unknown>`.

## Verification
- [x] `npm run build` pass ✅ (0 type errors, 28 routes generated)
