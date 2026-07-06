# Roadmap — refactor-data-access-layer

## 📍 Đang làm
- Initiative đã hoàn thành thành công! 🎉

## Phases

- ✅ Phase 1 — **Foundation: Repository + Service Layer + Realtime**
  8 repositories + 5 services + 1 realtime module. Build pass (28 routes, 0 type errors).

- ✅ Phase 2 — **Migrate Pages: Server Components + Server Actions**
  Chuyển 18 page từ `"use client"` gọi DB trực tiếp sang dùng Server Actions + Services mới. Build pass.

- ✅ Phase 3 — **API Route chuẩn hoá + Seed System**
  Refactor 7 API route sử dụng Service Layer mới, gỡ bỏ hoàn toàn `lib/api.ts`, `lib/mock-data.ts`, và `lib/supabase.ts`. Build pass.

- ✅ Phase 4 — **Type Safety: Auto-gen types từ DB schema**
  Supabase gen types, derive app types từ DB types, script `npm run types:gen`. Build pass.

> Marker: ⏳ chưa · 🔄 đang làm · ✅ xong
