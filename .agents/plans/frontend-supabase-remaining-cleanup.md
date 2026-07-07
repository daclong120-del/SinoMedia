# Frontend Supabase Refactor — Remaining Cleanup Plan

Ngày lập: 2026-07-07  
Mục tiêu: xử lý các nợ còn lại sau refactor frontend/Supabase để chuẩn bị commit/merge an toàn.

## 0. Trạng thái hiện tại

Các check mới nhất từ `dashboard/` đã pass:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Kết quả:

- `tsc`: PASS
- `lint`: PASS
- `build`: PASS
- `DbClient` đã sạch `any`:

```ts
export type DbClient = SupabaseClient<Database>;
```

Các boundary kiến trúc chính cũng đã đúng:

- `createClientBrowser()` chỉ còn trong:
  - `dashboard/lib/realtime/subscriptions.ts`
  - `dashboard/lib/supabase/client.ts`
- Creative dashboard pages không còn client fetch `/api/creative/*`.
- `/dash/tasks` đã tách server page và client component.

Vấn đề còn lại:

1. Build vẫn cảnh báo Next 16: `middleware` file convention deprecated, nên dùng `proxy`.
2. Có 3 inline disable hẹp cho `<img>` remote crawler media.
3. GitNexus báo `risk_level = high` vì diff rộng: khoảng 70 files, 149 changed symbols, 15 affected processes.
4. Worktree còn nhiều thay đổi ngoài scope code dashboard cần phân loại trước commit.
5. Có file `scratch/*` đang bị xóa, cần owner xác nhận.

## 1. Luật không được vi phạm

- Không sửa schema Supabase.
- Không sửa crawler-pipeline.
- Không xóa API routes creative trong lượt này.
- Không commit.
- Không chạy `git reset --hard`, `git checkout --`, hoặc revert hàng loạt.
- Không thêm `any`, `@ts-ignore`, `@ts-expect-error`.
- Không sửa code production nếu chưa chạy GitNexus impact theo AGENTS.md.
- Nếu impact báo HIGH/CRITICAL cho symbol định sửa, phải ghi rõ blast radius trước khi sửa.

## 2. Phase 1 — Migrate Next 16 `middleware` sang `proxy`

Lỗi/warning hiện tại khi `npm.cmd run build`:

```text
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

Files liên quan:

```text
dashboard/middleware.ts
dashboard/lib/supabase/middleware.ts
```

### 2.1. Impact analysis bắt buộc

Trước khi sửa `dashboard/middleware.ts` hoặc `updateSession`, chạy GitNexus:

```text
impact({ repo: "SinoMedia", target: "middleware", direction: "upstream" })
impact({ repo: "SinoMedia", target: "updateSession", direction: "upstream" })
```

Nếu tool không resolve được `middleware`, dùng `context()` hoặc `query()` để tìm đúng symbol/file:

```text
context({ repo: "SinoMedia", name: "updateSession" })
query({ repo: "SinoMedia", search_query: "Next middleware auth redirect updateSession dashboard login" })
```

Ghi lại trong final:

- Direct callers
- Affected processes
- Risk level

### 2.2. Xác minh convention local

Ưu tiên tài liệu local hoặc thông báo build của Next 16. Repo đang dùng:

```json
"next": "16.2.10"
```

Chạy:

```powershell
rg -n "middleware-to-proxy|proxy" dashboard/node_modules/next -g "*.md" -g "*.js" -g "*.d.ts"
```

Mục tiêu: xác nhận file convention mới là `proxy.ts`, export function tên `proxy`, và `config.matcher` vẫn được hỗ trợ.

### 2.3. Cách sửa đề xuất

Đổi entrypoint:

```text
dashboard/middleware.ts -> dashboard/proxy.ts
```

Trong file mới, đổi:

```ts
export async function middleware(request: NextRequest) {
```

thành:

```ts
export async function proxy(request: NextRequest) {
```

Giữ nguyên logic redirect:

- `/dash/*` chưa login → redirect `/login?redirect_uri=...`
- `/login`, `/sign-up`, `/forgot-password` đã login → redirect `/dash/home`
- return `supabaseResponse` nếu không redirect
- giữ nguyên `config.matcher`

Không đổi `dashboard/lib/supabase/middleware.ts` trừ khi build/type bắt buộc.

### 2.4. Acceptance

Chạy từ `dashboard/`:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Kỳ vọng:

- Cả 3 command PASS.
- Build không còn warning `middleware file convention is deprecated`.
- Build output vẫn có proxy/middleware behavior.

Manual smoke test nếu có thể chạy dev server:

```powershell
npm.cmd run dev
```

Kiểm tra bằng browser hoặc curl:

- Chưa login vào `/dash/home` phải bị redirect về `/login`.
- Đã có mock/session user vào `/login` phải bị redirect về `/dash/home`.
- Public route `/` không bị ảnh hưởng.

## 3. Phase 2 — Quyết định xử lý 3 `<img>` disables

Hiện có 3 inline disables:

```text
dashboard/components/dashboard/CreativeCard.tsx
dashboard/components/dashboard/CreativeDetailView.tsx
```

Hiện trạng này chấp nhận được vì:

- Disable rất hẹp, chỉ cho rule `@next/next/no-img-element`.
- Có comment giải thích: remote crawler media URLs dynamic, `next/image` domains chưa khóa.
- `lint` đã PASS.

### Option A — Giữ nguyên

Được chọn nếu media crawler có URL từ nhiều domain động.

Acceptance:

```powershell
npm.cmd run lint
```

PASS và final ghi:

```md
<img> disables intentionally kept for dynamic crawler media URLs.
```

### Option B — Chuyển sang `next/image`

Chỉ làm nếu đã khóa được remote patterns trong `next.config.ts`.

Việc cần làm:

1. Kiểm tra `dashboard/next.config.ts`.
2. Xác định domain/pattern media thực tế từ crawler/Supabase/R2.
3. Thêm `images.remotePatterns`.
4. Đổi 3 `<img>` sang `Image`.
5. Đảm bảo layout không vỡ với aspect ratio hiện tại.

Không chọn Option B nếu chưa biết chắc domain ảnh, vì có thể làm hỏng ảnh động từ crawler.

## 4. Phase 3 — Scope audit và dọn staged/unstaged

Hiện worktree có cả staged và unstaged changes. Trước khi commit phải phân loại.

Chạy:

```powershell
git status --short
git diff --name-status
git diff --cached --name-status
```

Phân loại thành 4 nhóm.

### 4.1. Nhóm nên giữ cho frontend/Supabase refactor

Ví dụ:

```text
dashboard/app/(auth)/**
dashboard/app/(main)/dash/**
dashboard/app/api/creative/**
dashboard/components/**
dashboard/lib/actions/**
dashboard/lib/repositories/**
dashboard/lib/services/**
dashboard/lib/supabase/**
dashboard/lib/utils/**
dashboard/types/**
```

Nhưng vẫn phải review từng file, không stage mù.

### 4.2. Nhóm docs/plans có thể giữ nếu owner đồng ý

```text
docs/**
.agents/plans/**
AGENTS.md
CLAUDE.md
```

Lưu ý:

- `docs/architecture/architecture.md` là source-of-truth kiến trúc mới.
- `.agents/plans/*` là tài liệu điều phối AI.
- `AGENTS.md` và `CLAUDE.md` có thể là file instruction quan trọng, cần xác nhận trước commit nếu không nằm trong PR docs.

### 4.3. Nhóm cần owner xác nhận trước commit

Không tự ý commit/xóa nếu chưa được user xác nhận:

```text
scratch/seed_db.ts
scratch/test_plan.md
scratch/test_supabase.ts
```

Nếu đây là file tạm cũ thật sự không dùng nữa, ghi rõ trong summary. Nếu không chắc, để nguyên deletion nhưng báo owner confirm.

### 4.4. Nhóm line-ending/noise

Git đang báo một số file sẽ đổi LF → CRLF. Không tự format toàn repo.

Nếu diff chỉ do line ending, tránh đưa vào commit hoặc normalize bằng `.gitattributes` trong PR riêng.

## 5. Phase 4 — GitNexus final detect_changes

Sau khi sửa `proxy` và dọn scope, chạy:

```text
detect_changes({ repo: "SinoMedia", scope: "all" })
```

Ghi lại:

- `risk_level`
- `changed_files`
- `changed_count`
- `affected_count`
- affected process names

Nếu vẫn HIGH:

- Không được lờ đi.
- Phải giải thích vì sao HIGH: diff rộng, auth/service/repository/page touched.
- Nếu scope đã được dọn mà vẫn HIGH, đề xuất chia commit/PR nhỏ hơn.

## 6. Final verification bắt buộc

Chạy từ `dashboard/`:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Audit từ repo root:

```powershell
rg -n "createClientBrowser" dashboard/app dashboard/lib dashboard/components
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|\\bas any\\b|: any|any\\[\\]" dashboard/app dashboard/lib dashboard/components dashboard/types
rg -n "/api/creative|fetch\\(" "dashboard/app/(main)/dash/creative"
rg -n "export async function middleware|middleware\\(" dashboard
rg -n "export async function proxy|proxy\\(" dashboard
```

Kỳ vọng:

- `tsc`: PASS
- `lint`: PASS
- `build`: PASS, không còn middleware deprecation warning nếu Phase 1 đã làm
- `createClientBrowser()` chỉ còn ở realtime + client factory
- Không còn `any` mới
- Không còn creative client fetch `/api/creative/*`
- Không còn `dashboard/middleware.ts` nếu đã migrate sang `dashboard/proxy.ts`

## 7. Final response format bắt buộc cho AI fix

AI kia phải trả theo format:

```md
## Summary
- ...

## Fixed
- [x] Migrated Next 16 middleware convention to proxy / or deferred with reason
- [x] Verified no DbClient any/eslint-disable regression
- [x] Verified frontend/Supabase boundaries
- [x] Ran GitNexus detect_changes

## Verification
- npx.cmd tsc --noEmit: PASS/FAIL
- npm.cmd run lint: PASS/FAIL
- npm.cmd run build: PASS/FAIL
- Middleware/proxy warning: fixed/deferred
- GitNexus detect_changes: risk=..., changed_files=..., changed_count=..., affected_count=...

## Scope Audit
### Dashboard refactor files
- ...

### Docs/plans files
- ...

### Needs owner confirmation
- ...

## Remaining / Deferred
- <img> dynamic media handling: kept/fixed
- scratch deletions: confirmed/not confirmed
- split commit recommendation: yes/no
```

Không được nói “done” nếu:

- `tsc`, `lint`, hoặc `build` fail.
- Không chạy GitNexus `detect_changes`.
- Không báo rõ các file `scratch/*` đang bị xóa.
- Không giải thích `risk_level = high` nếu GitNexus vẫn báo high.

