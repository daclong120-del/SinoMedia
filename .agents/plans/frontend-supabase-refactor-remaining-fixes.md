# Frontend Supabase Refactor — Remaining Fix Plan

Ngày lập: 2026-07-07  
Người review: Codex  
Mục tiêu: sửa nốt các lỗi còn lại sau đợt refactor Frontend Supabase để đạt Definition of Done trong `docs/architecture/architecture.md` và `.agents/plans/frontend-supabase-refactor-todo.md`.

## 0. Kết luận review hiện tại

Chưa được mark done.

Các lệnh đã kiểm:

```powershell
cd D:\Python\SinoMedia\dashboard
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Kết quả:

- `npx.cmd tsc --noEmit`: **PASS**
- `npm.cmd run build`: **PASS** nếu có network tải Google Fonts
- `npm.cmd run lint`: **FAIL**
- GitNexus `detect_changes({ repo: "SinoMedia", scope: "all" })`: **risk_level = high**, 53 files changed, 13 flows affected

Điểm đã làm đúng:

- `dashboard/types/supabase.ts` đã hết lỗi binary/UTF-16.
- `createClientBrowser()` chỉ còn được dùng trong `dashboard/lib/realtime/subscriptions.ts`.
- Repository constructors đã đổi sang `DbClient`, không còn `constructor(private db: any)`.
- Nhiều creative pages đã tách server `page.tsx` + client island.
- Không còn client fetch `/api/creative/*` trong các creative pages đã migrate.
- Production build pass.

Điểm chưa đạt:

- Lint còn 5 errors.
- `/dash/tasks` vẫn là `"use client"` toàn page và initial load trong `useEffect`.
- Vẫn còn `any`/eslint-disable trong `debounce.ts`.
- Một số warnings chưa dọn.

## 1. Không được làm

Không làm các việc sau trong lượt fix này:

- Không sửa crawler-pipeline.
- Không đổi schema Supabase.
- Không xóa API routes creative nếu chưa audit caller đầy đủ.
- Không dùng blanket eslint-disable để “qua lint”.
- Không sửa docs lan man ngoài plan/refactor nếu không cần.
- Không revert thay đổi của người khác bằng `git reset`, `checkout`, `restore`.

## 2. Bắt buộc trước khi sửa

Theo `AGENTS.md`, trước khi sửa symbol/class/function/method, chạy GitNexus impact.

Tối thiểu chạy cho các symbol sau:

```text
impact({ repo: "SinoMedia", target: "PostRepository", file_path: "dashboard/lib/repositories/post.repo.ts", direction: "upstream" })
impact({ repo: "SinoMedia", target: "TasksPage", file_path: "dashboard/app/(main)/dash/tasks/page.tsx", direction: "upstream" })
impact({ repo: "SinoMedia", target: "debounce", file_path: "dashboard/lib/utils/debounce.ts", direction: "upstream" })
```

Nếu impact báo HIGH/CRITICAL cho symbol nào thì ghi lại trong summary trước khi sửa tiếp.

Sau khi sửa xong, chạy:

```text
detect_changes({ repo: "SinoMedia", scope: "all" })
```

## 3. Phase 1 — Sửa 5 lint errors bắt buộc

### 3.1. Sửa `dashboard/lib/repositories/types.ts`

Hiện tại:

```ts
export type DbClient = SupabaseClient<Database, any, any>;
```

Lint errors:

```text
dashboard/lib/repositories/types.ts
  4:49  error  Unexpected any
  4:54  error  Unexpected any
```

Yêu cầu:

- Không dùng `any`.
- Ưu tiên dùng đúng generic đơn giản nếu SupabaseClient cho phép:

```ts
export type DbClient = SupabaseClient<Database>;
```

Nếu TypeScript báo không tương thích với `createClientServer()`, dùng `unknown` thay vì `any`:

```ts
export type DbClient = SupabaseClient<Database, unknown, unknown>;
```

Nhưng hãy thử `SupabaseClient<Database>` trước.

Acceptance:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
```

không còn lỗi ở `repositories/types.ts`.

### 3.2. Sửa `dashboard/lib/repositories/post.repo.ts`

Hiện tại:

```ts
query = query.order("stats->play_count" as any, { ascending: false });
query = query.order("stats->like_count" as any, { ascending: false });
query = query.order("stats->comment_count" as any, { ascending: false });
```

Lint errors:

```text
dashboard/lib/repositories/post.repo.ts
  74:50  error  Unexpected any
  76:50  error  Unexpected any
  78:53  error  Unexpected any
```

Yêu cầu:

- Không dùng `as any`.
- Không disable lint.
- Giữ behavior sort theo JSON stats.

Các hướng chấp nhận được:

#### Option A — helper typed local, ưu tiên nếu TS pass

Tạo union type:

```ts
type PostOrderColumn =
  | "published_at"
  | "stats->play_count"
  | "stats->like_count"
  | "stats->comment_count";
```

Tạo helper:

```ts
function orderPosts(
  query: ReturnType<DbClient["from"]>,
  column: PostOrderColumn,
  ascending: boolean,
) {
  return query.order(column, { ascending });
}
```

Nếu `ReturnType<DbClient["from"]>` không đủ chính xác, đừng ép quá lâu.

#### Option B — isolate Supabase typing gap bằng `unknown`, không `any`

Nếu Supabase type không chấp nhận JSON path column, dùng cast qua `unknown` với comment ngắn:

```ts
const orderByJsonStat = (column: "stats->play_count" | "stats->like_count" | "stats->comment_count") =>
  column as unknown as "published_at";
```

Rồi:

```ts
query = query.order(orderByJsonStat("stats->play_count"), { ascending: false });
```

Comment bắt buộc:

```ts
// Supabase supports JSON path ordering at runtime, but generated table column types do not include it.
```

Không dùng `any`.

Acceptance:

- Không còn `as any` trong `post.repo.ts`.
- `tsc` pass.
- `lint` không còn error ở `post.repo.ts`.

## 4. Phase 2 — Sửa `debounce.ts`, bỏ eslint-disable nếu có thể

File:

```text
dashboard/lib/utils/debounce.ts
```

Hiện còn:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
export function debounce<T extends (...args: any[]) => any>(
```

Yêu cầu:

- Bỏ eslint-disable.
- Không dùng `any`.
- Giữ generic return behavior.

Gợi ý implementation:

```ts
export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  delay: number,
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
```

Nếu callers cần preserve return type, kiểm tra usages bằng:

```powershell
rg -n "debounce\\(" dashboard
```

Acceptance:

- Không còn `any` trong `debounce.ts`.
- Không còn eslint-disable trong `debounce.ts`.
- `tsc` pass.

## 5. Phase 3 — Chuyển `/dash/tasks` sang Server Component + Client Island

Hiện tại:

```text
dashboard/app/(main)/dash/tasks/page.tsx
```

vẫn bắt đầu bằng:

```ts
"use client";
```

và initial data load nằm trong:

```ts
useEffect(() => {
  async function load() {
    const data = await getTasks();
    setTasks(data);
  }
  load();
}, []);
```

Yêu cầu kiến trúc:

```text
Server page.tsx
  -> await getTasks()
  -> render TasksClient initialTasks={tasks}

Client tasks-client.tsx
  -> giữ modal/form/filter/realtime
  -> subscribeToTasks()
  -> subscribeToTaskLogs()
  -> createTasksBulk action
```

### 5.1. Tạo file client

Tạo:

```text
dashboard/app/(main)/dash/tasks/tasks-client.tsx
```

Move toàn bộ UI hiện tại từ `page.tsx` sang `tasks-client.tsx`.

Đầu file client:

```ts
"use client";
```

Props:

```ts
interface TasksClientProps {
  initialTasks: CrawlerTask[];
}
```

State ban đầu:

```ts
const [tasks, setTasks] = useState<CrawlerTask[]>(initialTasks);
```

Xóa useEffect initial load.

### 5.2. Sửa server page

`page.tsx` mới:

```ts
import { getTasks } from "@/lib/actions/crawler.actions";
import TasksClient from "./tasks-client";

export default async function TasksPage() {
  const initialTasks = await getTasks();
  return <TasksClient initialTasks={initialTasks} />;
}
```

Nếu muốn thuần service thay vì action:

```ts
import { getTasks } from "@/lib/services/crawler.service";
```

Nhưng phải đảm bảo return type trùng `CrawlerTask[]`. Nếu action đã là wrapper server-side ổn định, tạm chấp nhận dùng action để giảm blast radius.

### 5.3. Realtime giữ trong client

Trong `tasks-client.tsx`, giữ:

- `subscribeToTasks`
- `subscribeToTaskLogs`
- realtime channel refs
- modal/form state

Nhưng không gọi initial `getTasks()` trong `useEffect`.

### 5.4. Sửa set-state-in-effect nếu lint báo lại

Hiện lint chưa báo lỗi này nữa vì AI kia dùng `setTimeout(..., 0)`, nhưng cách đó hơi “né rule”. Nếu lint pass thì tạm chấp nhận; nếu muốn sạch hơn:

- `setIsRealtimeConnected(true)` chỉ update trong callback subscribe status nếu Supabase channel expose status.
- `setTaskLogs([])` nên chạy trong handler khi chọn task, không trong effect.

Acceptance:

- `dashboard/app/(main)/dash/tasks/page.tsx` không còn `"use client"`.
- `tasks-client.tsx` có `"use client"`.
- Không còn `useEffect` initial load `getTasks()`.
- Realtime vẫn nằm trong client.
- `tsc` pass.
- `lint` không thêm lỗi.

## 6. Phase 4 — Dọn warnings dễ xử lý

Không bắt buộc để build pass, nhưng nên dọn để `lint` sạch hơn.

Warnings hiện tại:

```text
growth-client.tsx: Platform unused
new-client.tsx: Platform unused
creative/trending/page.tsx: Platform unused, tableData unused
data/authors/page.tsx: loading unused
data/management/page.tsx: getTags unused
data/posts/page.tsx: mockComments unused, loading unused, missing selectedPost dependency
manage-account/members/page.tsx: Link, Check, ArrowUpDown unused
CreativeCard.tsx: img warning
CreativeDetailView.tsx: img warnings
```

Ưu tiên dọn:

- unused imports/vars: xóa.
- `data/posts/page.tsx` missing dependency: thêm dependency hoặc refactor effect để không capture stale `selectedPost`.

Có thể để lại `<img>` warnings nếu chưa muốn migrate sang `next/image`, nhưng ghi rõ trong summary.

Acceptance mềm:

- `npm.cmd run lint` nên còn 0 errors.
- Nếu còn warnings thì chỉ nên là `<img>` warnings và có note rõ.

## 7. Phase 5 — Kiểm tra API route creative

Hiện các creative pages đã không còn client fetch `/api/creative/*`. Tuy nhiên API routes vẫn tồn tại.

Không xóa ngay nếu chưa chắc không có caller khác.

Chạy:

```powershell
rg -n "/api/creative|fetch\\(" dashboard/app dashboard/components dashboard/lib
```

Nếu không có caller ngoài route files:

- hoặc thêm comment `@deprecated` trên GET route,
- hoặc tạo task riêng để xóa API routes sau.

Trong lượt fix này, **không bắt buộc xóa route**.

## 8. Final verification bắt buộc

Chạy:

```powershell
cd D:\Python\SinoMedia\dashboard
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Lưu ý:

- Nếu `npm.cmd run build` fail vì Google Fonts network trong sandbox, chạy lại với quyền network hoặc ghi rõ lỗi hạ tầng.
- Build đã từng pass khi có network.

Chạy audit:

```powershell
rg -n "createClientBrowser" dashboard/app dashboard/lib dashboard/components
rg -n "constructor\\(private db: any\\)|\\bas any\\b|: any|any\\[\\]" dashboard/app dashboard/lib dashboard/components dashboard/types
rg -n "/api/creative|fetch\\(" dashboard/app/\(main\)/dash/creative
```

Kỳ vọng:

- `createClientBrowser` chỉ trong `lib/realtime/subscriptions.ts` và `lib/supabase/client.ts`.
- Không còn `constructor(private db: any)`.
- Không còn lint error vì `any`.
- Không còn creative client fetch initial data qua `/api/creative/*`.

GitNexus:

```text
detect_changes({ repo: "SinoMedia", scope: "all" })
```

Ghi lại:

- `risk_level`
- `changed_files`
- affected processes

## 9. Báo cáo cuối cùng AI kia phải trả

Yêu cầu AI kia trả đúng format:

```md
## Summary
- ...

## Fixed
- [x] Lint errors in repositories/types.ts
- [x] Lint errors in post.repo.ts
- [x] debounce.ts any cleanup
- [x] /dash/tasks split server page + client island

## Verification
- npx.cmd tsc --noEmit: PASS/FAIL
- npm.cmd run lint: PASS/FAIL
- npm.cmd run build: PASS/FAIL
- GitNexus detect_changes: risk=..., changed_files=...

## Remaining warnings / known issues
- ...
```

Nếu `npm.cmd run lint` vẫn fail thì không được nói là done.

