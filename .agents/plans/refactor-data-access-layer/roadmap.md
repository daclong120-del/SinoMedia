# Roadmap — refactor-data-access-layer

## 📍 Đang làm
- Phase 2 (🔄) — đang brainstorm

## Phases

- ✅ Phase 1 — **Foundation: Repository + Service Layer + Realtime**
  8 repositories + 5 services + 1 realtime module. Build pass (28 routes, 0 type errors).

- 🔄 Phase 2 — **Migrate Pages: Server Components + Server Actions**
  Chuyển 18 page từ `"use client"` → Server Component + Client subcomponent. Xoá api.ts + mock-data.ts.

- ⏳ Phase 3 — **API Route chuẩn hoá + Seed System**
  Refactor 6 API route, tạo thêm write routes, CLI seed `npm run db:seed`.

- ⏳ Phase 4 — **Type Safety: Auto-gen types từ DB schema**
  Supabase gen types, derive app types từ DB types, script `npm run types:gen`.

> Marker: ⏳ chưa · 🔄 đang làm · ✅ xong
