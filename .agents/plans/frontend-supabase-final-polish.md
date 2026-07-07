# Frontend Supabase Refactor — Final Polish Plan

Ngày lập: 2026-07-07  
Mục tiêu: sửa nốt các nợ nhỏ còn lại sau khi refactor đã build/lint pass, để trạng thái sạch hơn trước khi merge/commit.

## 0. Trạng thái review mới nhất

Các lệnh đã chạy từ `dashboard/`:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Kết quả:

- `tsc`: **PASS**
- `lint`: **PASS**, còn 3 warnings `<img>`
- `build`: **PASS**
- Kiến trúc chính: **PASS**
  - `createClientBrowser()` chỉ còn trong realtime.
  - Creative pages không client-fetch `/api/creative/*`.
  - `/dash/tasks` đã tách server `page.tsx` + `tasks-client.tsx`.
  - `debounce.ts` đã bỏ `any`.

Vấn đề còn lại:

1. `dashboard/lib/repositories/types.ts` vẫn dùng `eslint-disable` để né `any`.
2. 3 warnings `<img>` còn trong `CreativeCard.tsx` và `CreativeDetailView.tsx`.
3. Build warning Next 16: `middleware` convention deprecated, nên dùng `proxy`.
4. GitNexus `detect_changes` vẫn báo `risk_level = high` vì diff rất rộng.
5. Worktree có thay đổi/xóa ngoài scope dashboard cần xác nhận trước commit.

## 1. Không được làm

- Không đổi schema Supabase.
- Không sửa crawler-pipeline.
- Không xóa API routes creative trong lượt này.
- Không commit.
- Không dùng thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
- Không reset/revert thay đổi của người khác.

## 2. Phase 1 — Bỏ `any` và eslint-disable trong `repositories/types.ts`

File:

```text
dashboard/lib/repositories/types.ts
```

Hiện tại:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = SupabaseClient<Database, any, any>;
```

Yêu cầu:

- Bỏ dòng `eslint-disable`.
- Không dùng `any`.
- Chạy `tsc` và `lint` sau mỗi phương án.

Thử theo thứ tự:

### Option A — Preferred

```ts
export type DbClient = SupabaseClient<Database>;
```

Nếu `tsc` pass, dừng ở đây.

### Option B — Nếu Option A không tương thích

Thử dùng schema name cụ thể nếu Supabase type yêu cầu:

```ts
export type DbClient = SupabaseClient<Database, "public">;
```

Nếu `tsc` pass, dừng ở đây.

### Option C — Nếu generated Supabase types bắt buộc generic thứ 3

Dùng `unknown`, không dùng `any`:

```ts
export type DbClient = SupabaseClient<Database, "public", unknown>;
```

Chỉ dùng nếu Option A/B fail.

Acceptance:

```powershell
rg -n "eslint-disable|\\bany\\b" dashboard/lib/repositories/types.ts
npx.cmd tsc --noEmit
npm.cmd run lint
```

Kỳ vọng:

- `rg` không còn match `eslint-disable` hoặc `any`.
- `tsc` pass.
- `lint` pass.

## 3. Phase 2 — Optional: xử lý 3 warnings `<img>`

Warnings hiện còn:

```text
dashboard/components/dashboard/CreativeCard.tsx
dashboard/components/dashboard/CreativeDetailView.tsx
```

Nếu muốn lint sạch tuyệt đối, có 2 hướng:

### Option A — Giữ `<img>` nhưng disable rất hẹp, có lý do

Chỉ dùng nếu media URL remote/dynamic chưa cấu hình được `next/image` domains.

Ví dụ:

```tsx
{/* eslint-disable-next-line @next/next/no-img-element -- Remote crawler media URLs are dynamic; next/image domains are not locked yet. */}
<img ... />
```

Lưu ý: nếu dùng hướng này thì chỉ disable rule `@next/next/no-img-element`, không disable toàn file.

### Option B — Chuyển sang `next/image`

Chỉ làm nếu đã kiểm tra `next.config.ts` cho remote image domains/patterns.

Không nên đổi bừa nếu media URL đến từ nhiều domain crawler khác nhau.

Acceptance:

- `npm.cmd run lint` pass.
- Nếu còn warnings `<img>`, ghi rõ trong final summary là intentionally deferred.

## 4. Phase 3 — Optional: Next 16 middleware deprecation

Build warning:

```text
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

Files liên quan:

```text
dashboard/middleware.ts
dashboard/lib/supabase/middleware.ts
```

Yêu cầu:

- Chỉ xử lý nếu biết rõ Next 16 convention hiện tại trong local docs/package.
- Không rename bừa nếu route/auth middleware có thể bị mất tác dụng.

Nếu xử lý:

1. Tìm docs local của Next 16 trong `node_modules/next/dist/docs` nếu có.
2. Xác định file convention `proxy.ts` cần export gì.
3. Rename/migrate `dashboard/middleware.ts` → `dashboard/proxy.ts` nếu đúng.
4. Chạy build và manual check auth redirect.

Nếu không xử lý:

- Ghi trong final summary: `middleware -> proxy warning deferred`.

## 5. Phase 4 — Scope audit trước commit/merge

Worktree hiện có nhiều thay đổi ngoài refactor dashboard, ví dụ:

- `AGENTS.md`
- `CLAUDE.md`
- `.agents/plans/*`
- `docs/**`
- `scratch/*.ts/md` bị xóa

Yêu cầu:

Chạy:

```powershell
git status --short
git diff --name-status
```

Phân loại trong final summary:

```md
## Scope Audit

### Expected dashboard refactor files
- ...

### Docs/plans touched intentionally
- ...

### Needs owner confirmation before commit
- AGENTS.md
- CLAUDE.md
- scratch/...
```

Không tự revert nếu không được yêu cầu.

## 6. Phase 5 — GitNexus final check

Chạy:

```text
detect_changes({ repo: "SinoMedia", scope: "all" })
```

Ghi lại:

- `risk_level`
- `changed_files`
- affected process names

Nếu risk vẫn `high`, không có nghĩa là fail, nhưng phải nêu rõ nguyên nhân: diff rộng, nhiều page/auth/repository touched.

## 7. Final verification bắt buộc

Chạy từ `dashboard/`:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Audit:

```powershell
rg -n "createClientBrowser" dashboard/app dashboard/lib dashboard/components
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|\\bas any\\b|: any|any\\[\\]" dashboard/app dashboard/lib dashboard/components dashboard/types
rg -n "/api/creative|fetch\\(" "dashboard/app/(main)/dash/creative"
```

Kỳ vọng:

- `tsc`: PASS
- `lint`: PASS
- `build`: PASS
- `createClientBrowser` chỉ trong `lib/realtime/subscriptions.ts` và `lib/supabase/client.ts`
- Không còn `any`/eslint-disable trong `repositories/types.ts`
- Không còn creative client fetch `/api/creative/*`

## 8. Final response format bắt buộc

AI kia phải trả:

```md
## Summary
- ...

## Fixed
- [x] Removed DbClient any/eslint-disable
- [x] Verified tsc/lint/build
- [x] Audited browser Supabase and creative fetch boundaries

## Verification
- npx.cmd tsc --noEmit: PASS/FAIL
- npm.cmd run lint: PASS/FAIL
- npm.cmd run build: PASS/FAIL
- GitNexus detect_changes: risk=..., changed_files=...

## Remaining / Deferred
- <img> warnings: fixed/deferred
- middleware -> proxy warning: fixed/deferred
- Files needing owner confirmation: ...
```

Không được nói “done” nếu `tsc`, `lint`, hoặc `build` fail.

