# Frontend Supabase Refactor TODO

Ngày lập: 2026-07-07  
Mục tiêu: khóa lại kiến trúc Dashboard Next.js 16 ↔ Supabase theo mô hình Server Component → Service → Repository → Supabase server client; browser client chỉ dùng cho Realtime.

Tài liệu này dành cho AI/agent khác tiếp tục sửa code. Không phải tài liệu kiến trúc lý tưởng; đây là checklist việc cần làm dựa trên trạng thái code hiện tại.

## 0. Bối cảnh đã quan sát bằng GitNexus

GitNexus repo: `SinoMedia`

- Path: `D:\Python\SinoMedia`
- Index: 2026-07-07
- Quy mô index: 281 files, 2,883 symbols, 6,688 edges, 236 execution flows
- Các symbol trung tâm đã kiểm tra:
  - `createClientServer` tại `dashboard/lib/supabase/server.ts`
  - `PostRepository` tại `dashboard/lib/repositories/post.repo.ts`
  - `searchAds` tại `dashboard/lib/services/creative.service.ts`

Kết luận từ GitNexus:

- `createClientServer` là dependency trung tâm của service layer. Nó được gọi bởi:
  - `dashboard.service.ts`
  - `data.service.ts`
  - `creative.service.ts`
  - `crawler.service.ts`
  - `system.service.ts`
  - `auth.service.ts`
  - `auth.actions.ts`
- `PostRepository` được gọi bởi:
  - `creative.service.ts`
  - `dashboard.service.ts`
  - `data.service.ts`
- `searchAds` được gọi bởi:
  - API routes: `app/api/creative/search|trending|new|growth/route.ts`
  - service wrappers: `getTrending`, `getNew`, `getGrowth`, `getSimilar`
- Browser Supabase client hiện chỉ thấy trong:
  - `dashboard/lib/supabase/client.ts`
  - `dashboard/lib/realtime/subscriptions.ts`

Điểm này tốt và cần giữ: `createClientBrowser()` chỉ nên phục vụ realtime WebSocket, không dùng CRUD.

## 1. Lệnh kiểm tra baseline

Chạy từ `D:\Python\SinoMedia\dashboard`.

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
```

Kết quả đã quan sát:

- `npx.cmd tsc --noEmit`: pass.
- `npm.cmd run lint`: fail với khoảng 85 errors và 45 warnings.
- PowerShell có thể chặn `npm` vì execution policy; dùng `npm.cmd`.

Lỗi lint lớn nhất:

- `dashboard/types/supabase.ts` bị ESLint báo `File appears to be binary`.
- Nhiều `@typescript-eslint/no-explicit-any`.
- Nhiều page đang `"use client"` và fetch read-data qua `/api/creative/*`.
- React compiler lint báo `react-hooks/set-state-in-effect` ở nhiều component/page.
- `dashboard/app/(main)/dash/home/page.tsx` có lỗi `react-hooks/immutability` do mutate `startAngle`.

## 2. Nguyên tắc kiến trúc cần khóa

Kiến trúc mong muốn:

```text
Server Component page.tsx
  -> service function
    -> repository
      -> createClientServer()
        -> Supabase PostgREST

Client Component
  -> chỉ giữ state/filter/interaction
  -> gọi Server Action hoặc API POST cho mutation
  -> subscribe realtime qua lib/realtime/subscriptions.ts khi cần
```

Quy tắc bắt buộc:

1. Không dùng `createClientBrowser()` để CRUD.
2. Không import trực tiếp Supabase client vào page/component, trừ realtime abstraction.
3. Read data nên đi qua Server Component gọi service trực tiếp.
4. API routes chỉ dùng cho mutation hoặc interactive actions thật sự cần HTTP boundary.
5. Repository là tầng duy nhất chạm table Supabase.
6. Service là tầng duy nhất map DB row sang UI/domain model.
7. Không fallback mock data khi DB lỗi. Phải surface lỗi hoặc empty-state có thông báo rõ.
8. Không để page biết schema Supabase raw (`stats`, `platform_id`, jsonb shape, v.v.).

## 3. Việc bắt buộc làm trước khi sửa code

Theo `AGENTS.md`, trước khi sửa symbol/function/class/method:

1. Chạy GitNexus impact:

```text
impact({ target: "<symbol>", direction: "upstream", repo: "SinoMedia" })
```

2. Nếu risk HIGH/CRITICAL thì báo người dùng trước khi sửa.
3. Sau khi sửa, chạy:

```text
detect_changes({ scope: "all", repo: "SinoMedia" })
```

4. Chạy lại:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
```

Nếu GitNexus stale, chạy từ root repo:

```powershell
node .gitnexus\run.cjs analyze
```

## 4. Phase 1 - Sửa nền TypeScript/Supabase types

### 4.1. Sửa encoding `dashboard/types/supabase.ts`

Hiện file này là UTF-16 LE có BOM (`FF FE`), nên ESLint xem như binary.

Việc cần làm:

- Convert file sang UTF-8.
- Không đổi nội dung type nếu không cần.
- Sau convert chạy lại `npm.cmd run lint` để xác nhận lỗi parse biến mất.

Gợi ý kiểm tra:

```powershell
$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath 'dashboard\types\supabase.ts'))
$bytes[0..3] | ForEach-Object { $_.ToString('X2') }
```

Sau khi sửa, byte đầu không nên là `FF FE`.

### 4.2. Tạo alias type cho Supabase DB client

Nên tạo file mới:

```text
dashboard/lib/repositories/types.ts
```

Nội dung đề xuất:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

export type DbClient = SupabaseClient<Database>;
export type Tables = Database["public"]["Tables"];
export type TableRow<T extends keyof Tables> = Tables[T]["Row"];
export type TableInsert<T extends keyof Tables> = Tables[T]["Insert"];
export type TableUpdate<T extends keyof Tables> = Tables[T]["Update"];
export type JsonValue = Json;
```

Sau đó repositories dùng `DbClient`, `TableRow<"...">`, `TableInsert<"...">` thay vì `any`.

## 5. Phase 2 - Type hóa repository layer

Hotspot hiện tại:

- `dashboard/lib/repositories/post.repo.ts`
- `dashboard/lib/repositories/author.repo.ts`
- `dashboard/lib/repositories/task.repo.ts`
- `dashboard/lib/repositories/account.repo.ts`
- `dashboard/lib/repositories/proxy.repo.ts`
- `dashboard/lib/repositories/audit.repo.ts`
- `dashboard/lib/repositories/comment.repo.ts`
- `dashboard/lib/repositories/log.repo.ts`

Hiện tất cả constructor kiểu:

```ts
constructor(private db: any) {}
```

Việc cần làm:

1. Chạy impact cho từng repository class trước khi sửa.
2. Đổi constructor sang:

```ts
constructor(private readonly db: DbClient) {}
```

3. Xóa import thừa:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
```

4. Khai báo return type rõ cho các method public.

Ví dụ cho `PostRepository`:

```ts
type CrawledPostRow = TableRow<"crawled_posts">;

async findMany(opts: PostQueryOpts = {}): Promise<{
  data: CrawledPostRow[];
  count: number;
}> { ... }

async findById(id: string): Promise<CrawledPostRow | null> { ... }
```

5. Với `stats`, `metadata`, `payload`, `filter_snapshot`, không cast `as any`. Dùng `Json` hoặc helper type guard.

Các lỗi cụ thể cần xử lý:

- `post.repo.ts`
  - `row: any` trong `countByPlatform()`.
  - `row: any` trong `countByDay()`.
  - Sort field `stats->play_count` có thể không được Supabase type generator hiểu; nếu cần, giữ query nhưng isolate cast ở một helper nhỏ, không lan `any` ra service.
- `task.repo.ts`
  - `metadata: (input.metadata ?? {}) as any`.
  - `.rpc("create_crawler_tasks", { p_tasks: tasks as any })`.
  - Cần map `CreateTaskInput` sang `Json`/RPC args type.
- `proxy.repo.ts`
  - `accountsRes.data.map((a: any) => ...)`.
  - `(proxiesRes.data ?? []).map((row: any) => ...)`.
- `audit.repo.ts`
  - `payload as any`.
  - `filter_snapshot as any`.

Acceptance criteria Phase 2:

- Không còn `constructor(private db: any)` trong `dashboard/lib/repositories`.
- Repository files không còn import `SupabaseClient`/`Database` trực tiếp nếu đã dùng alias.
- `npx.cmd tsc --noEmit` pass.

## 6. Phase 3 - Type hóa service layer và mapper

Hotspot:

- `dashboard/lib/services/creative.service.ts`
- `dashboard/lib/services/dashboard.service.ts`
- `dashboard/lib/services/data.service.ts`
- `dashboard/lib/services/crawler.service.ts`
- `dashboard/lib/services/system.service.ts`

### 6.1. `creative.service.ts`

Hiện file này map từ `Record<string, unknown>` và dùng nhiều `any`.

Việc cần làm:

1. Import DB row types từ repository/types:

```ts
type CrawledPostRow = TableRow<"crawled_posts">;
type CrawledAuthorRow = TableRow<"crawled_authors">;
```

2. Đổi mapper:

```ts
function mapPostToCreativeAd(
  row: CrawledPostRow,
  author?: CrawledAuthorRow | null
): CreativeAd
```

```ts
function mapAuthorToAdvertiser(
  author: CrawledAuthorRow,
  postCount: number,
  totalViews: number,
  totalLikes: number
): CreativeAdvertiser
```

3. Tạo helper đọc stats:

```ts
type PostStats = {
  play_count?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
};

function getPostStats(row: CrawledPostRow): PostStats {
  return typeof row.stats === "object" && row.stats !== null && !Array.isArray(row.stats)
    ? row.stats as PostStats
    : {};
}
```

4. Thay toàn bộ:

```ts
posts.map((p: any) => ...)
authors.map((a: any) => ...)
author as any
```

bằng typed row.

5. Cân nhắc đưa `views_history` giả lập ra helper riêng hoặc đánh dấu rõ là derived/mock-like. Không fallback mock data.

Acceptance:

- `creative.service.ts` không còn `any`.
- Public service functions trả đúng type:
  - `searchAds`
  - `getAdById`
  - `getAdvertisers`
  - `getAdvertiserById`
  - `getTrending`
  - `getNew`
  - `getGrowth`
  - `getSimilar`

### 6.2. `dashboard.service.ts`

Hiện lỗi:

- `tasks.filter((t: any) => ...)`
- `accounts.filter((a: any) => ...)`
- `accounts.forEach((row: any) => ...)`

Việc cần làm:

- Sau khi repository trả typed rows, bỏ toàn bộ `any`.
- Sửa mutation trong chart calculation ở `app/(main)/dash/home/page.tsx`:

Hiện lỗi lint:

```ts
let startAngle = 0;
const slices = data.map((d) => {
  const angle = ...
  const start = startAngle;
  startAngle += angle;
  return ...
});
```

Đổi sang reduce:

```ts
const slices = data.reduce<Array<Slice>>((acc, item) => {
  const previous = acc.at(-1);
  const startAngle = previous ? previous.startAngle + previous.angle : 0;
  const angle = total > 0 ? (item.count / total) * 360 : 0;
  acc.push({ ...item, startAngle, angle });
  return acc;
}, []);
```

Acceptance:

- `dashboard.service.ts` không còn `any`.
- `home/page.tsx` không còn lỗi `react-hooks/immutability`.

## 7. Phase 4 - Khóa boundary Server Component vs Client Component

Hiện nhiều page đang `"use client"` toàn trang, trong khi tài liệu kiến trúc yêu cầu page đọc data server-side.

Các page creative hiện client-fetch read API:

- `dashboard/app/(main)/dash/creative/search/page.tsx`
- `dashboard/app/(main)/dash/creative/new/page.tsx`
- `dashboard/app/(main)/dash/creative/growth/page.tsx`
- `dashboard/app/(main)/dash/creative/advertisers/page.tsx`
- `dashboard/app/(main)/dash/creative/advertisers/[id]/page.tsx`
- `dashboard/app/(main)/dash/creative/calendar/page.tsx`

Việc cần làm:

1. Tách mỗi page thành:

```text
page.tsx                 // Server Component, không "use client"
client.tsx hoặc *View.tsx // Client Component, có "use client"
```

2. `page.tsx` đọc `searchParams`, gọi service trực tiếp:

```ts
import { searchAds } from "@/lib/services/creative.service";

export default async function Page({ searchParams }: Props) {
  const result = await searchAds(parseSearchParams(searchParams));
  return <CreativeSearchClient initialData={result} />;
}
```

3. Client component chỉ giữ filter UI, pagination, interaction.
4. Khi filter đổi:
   - Ưu tiên update URL bằng router để Server Component render lại.
   - Tránh fetch `/api/creative/search` trong client cho read-data.
5. Giữ API routes creative tạm thời nếu cần backward compatibility, nhưng đánh dấu deprecated hoặc chỉ dùng cho trường hợp client-only đặc biệt.

Acceptance:

- Creative read pages không còn fetch `/api/creative/*` để lấy dữ liệu ban đầu.
- Page-level files đọc data không còn `"use client"` nếu không cần.
- Client files không import repository/service server-only trực tiếp.

## 8. Phase 5 - Xử lý React lint `set-state-in-effect`

Các lỗi đã thấy:

- `dashboard/app/(main)/dash/creative/search/page.tsx`
  - set search từ `initialSearch` trong effect.
  - reset page trong effect khi filter đổi.
- `dashboard/app/(main)/dash/creative/new/page.tsx`
  - reset page trong effect.
- `dashboard/app/(main)/dash/data/posts/page.tsx`
  - set comments empty trong effect.
- `dashboard/app/(main)/dash/proxies/page.tsx`
  - gọi `fetchList()` trong effect, function này set state sync theo rule lint.
- `dashboard/app/(main)/dash/tasks/page.tsx`
  - set realtime connected trong effect.
  - clear task logs trong effect.
- `dashboard/components/Header.tsx`
  - `setHasMounted(true)` trong effect.
- `dashboard/components/Sidebar.tsx`
  - `setHasMounted(true)` trong effect.

Hướng sửa:

1. Với state có thể derive từ props/searchParams: bỏ state, dùng derived value.
2. Với reset pagination: cập nhật page cùng lúc trong event handler thay vì effect.
3. Với `hasMounted`: cân nhắc dùng `useSyncExternalStore` cho persisted UI store hoặc render SSR-safe default.
4. Với data loading client-side còn cần giữ:
   - Có thể dùng async callback bên trong effect, nhưng tránh set state sync ngay ở body effect.
   - Nếu lint vẫn fail, tách thành custom hook hoặc chuyển initial load sang Server Component.

Không nên tắt rule ESLint hàng loạt trừ khi có lý do rõ và comment ngay tại dòng.

## 9. Phase 6 - Rà API routes và server actions

API routes creative hiện là read-data:

- `dashboard/app/api/creative/search/route.ts`
- `dashboard/app/api/creative/trending/route.ts`
- `dashboard/app/api/creative/new/route.ts`
- `dashboard/app/api/creative/growth/route.ts`
- `dashboard/app/api/creative/advertisers/route.ts`
- `dashboard/app/api/creative/advertisers/[id]/route.ts`
- `dashboard/app/api/creative/[id]/route.ts`

Theo kiến trúc mới, API routes chỉ nên dành cho interactive actions/mutations.

Việc cần làm:

1. Sau khi creative pages gọi service trực tiếp server-side, kiểm tra API route nào không còn caller.
2. Nếu còn dùng bởi client-only pages, migrate page trước.
3. Sau đó:
   - Xóa route không cần, hoặc
   - Giữ nhưng ghi comment `@deprecated` và test riêng.
4. Type hóa query param parsing, bỏ `as any`.

Ví dụ thay:

```ts
const sort = searchParams.get("sort") as any || "newest";
```

bằng parser:

```ts
const SORTS = ["newest", "oldest", "views", "likes", "comments"] as const;
type Sort = (typeof SORTS)[number];

function parseSort(value: string | null): Sort {
  return SORTS.includes(value as Sort) ? value as Sort : "newest";
}
```

Acceptance:

- API route files không còn `any`.
- Không còn client read-flow phụ thuộc `/api/creative/*` nếu page có thể là Server Component.

## 10. Phase 7 - Dọn utility/client storage typing

Files có `any` nhưng ít liên quan Supabase:

- `dashboard/lib/utils.ts`
- `dashboard/lib/utils/debounce.ts`
- `dashboard/lib/utils/storage-helper.ts`
- `dashboard/lib/stores/use-ui-store.ts`
- `dashboard/app/(auth)/login/login-form.tsx`
- `dashboard/app/(auth)/sign-up/sign-up-form.tsx`
- `dashboard/lib/actions/auth.actions.ts`
- `dashboard/lib/supabase/middleware.ts`

Việc cần làm:

- `utils.ts`: đổi `Record<string, any>` thành `Record<string, unknown>` hoặc type settings cụ thể.
- `storage-helper.ts`: generic helper:

```ts
export async function getStoredValue<T>(key: string, fallback: T): Promise<T>
```

- `debounce.ts`: thay `any` bằng `unknown[]` và bỏ alias `this` nếu có thể.
- Auth catch:

```ts
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
}
```

- `middleware.ts`: tránh `user as any`; dùng type Supabase `User | null` hoặc return object explicit.

Acceptance:

- Giảm dần `@typescript-eslint/no-explicit-any`.
- Không dùng blanket disable lint.

## 11. Phase 8 - Kiểm thử thủ công sau refactor

Chạy:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Nếu build cần env Supabase, chuẩn bị `.env.local` cho dashboard:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Manual smoke test:

1. `/dash/home`
   - metrics render.
   - platform chart không crash khi count = 0.
2. `/dash/creative/search`
   - initial data render từ server.
   - filter/search đổi URL hoặc refresh data đúng.
3. `/dash/creative/new`
   - pagination hoạt động.
4. `/dash/creative/growth`
   - sort/filter không crash.
5. `/dash/creative/advertisers`
   - advertiser list render.
6. `/dash/creative/advertisers/[id]`
   - detail render hoặc not-found rõ ràng.
7. `/dash/tasks`
   - task list render.
   - realtime subscriptions vẫn hoạt động.
8. `/dash/proxies`
   - add/update/delete proxy không regress.

## 12. Definition of Done

Tối thiểu để coi là refactor xong phase hiện tại:

- `dashboard/types/supabase.ts` là UTF-8 và ESLint đọc được.
- `npx.cmd tsc --noEmit` pass.
- `npm.cmd run lint` pass hoặc chỉ còn warnings đã được chấp nhận rõ.
- `createClientBrowser()` chỉ được import bởi `dashboard/lib/realtime/subscriptions.ts`.
- Không còn `constructor(private db: any)` trong repository layer.
- Creative read pages không còn client-fetch `/api/creative/*` cho initial data.
- Không có mock fallback che lỗi DB.
- GitNexus `detect_changes({ scope: "all", repo: "SinoMedia" })` đã chạy và phạm vi thay đổi đúng dự kiến.

## 13. Lệnh quan sát nhanh cho AI tiếp theo

```powershell
rg 'createClientBrowser|createClientServer|constructor\(private db: any\)|/api/creative|mock-data|@/lib/supabase' dashboard\app dashboard\lib dashboard\components
rg 'any' dashboard\app dashboard\lib dashboard\components dashboard\types
npx.cmd tsc --noEmit
npm.cmd run lint
```

GitNexus:

```text
query({
  repo: "SinoMedia",
  search_query: "dashboard Supabase repository service layer creative routes server component realtime subscriptions",
  goal: "Continue frontend Supabase architecture refactor"
})

context({ repo: "SinoMedia", name: "createClientServer", file_path: "dashboard/lib/supabase/server.ts" })
context({ repo: "SinoMedia", name: "PostRepository", file_path: "dashboard/lib/repositories/post.repo.ts" })
context({ repo: "SinoMedia", name: "searchAds", file_path: "dashboard/lib/services/creative.service.ts" })
```

