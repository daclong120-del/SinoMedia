# Cây "à, nghĩa là..." — Phase 1: Foundation

## 1. Repository Pattern

### post.repo.ts
- à, nghĩa là cần class `PostRepository` nhận `SupabaseClient`
  - à, nghĩa là constructor `(private db: SupabaseClient)` — không dùng global import
  - à, nghĩa là phương thức `findMany(opts)`:
    - filter: platform (eq), search (ilike caption), limit (default 50), offset (range)
    - sort: crawled_at desc (mặc định)
    - trả raw DB row — KHÔNG map sang app type ở đây (service sẽ map) ✅
  - à, nghĩa là phương thức `count()`:
    - `select("id", { count: "exact", head: true })` → trả `number`
  - à, nghĩa là phương thức `countByPlatform()`:
    - `select("platform")` → aggregate client-side → `Record<string, number>` ✅
    - **Vì sao không dùng RPC/View?** DB local chưa có function, giữ đơn giản, data < 10k row ✅
  - à, nghĩa là phương thức `countByDay(days: number)`:
    - `select("published_at").gte("published_at", N ngày trước)` → aggregate → `{ date: string; count: number }[]` ✅

### author.repo.ts
- à, nghĩa là `findMany(opts)`:
  - filter: platform (eq), search (ilike nickname), limit (default 50)
  - sort: updated_at desc ✅
- à, nghĩa là `count()`: select count head ✅

### task.repo.ts
- à, nghĩa là `findAll()`: select * order created_at desc limit 100 ✅
- à, nghĩa là `create(task)`: insert → return representation ✅
  - **Quan trọng:** status mặc định "pending", created_by "system" ✅
- à, nghĩa là `updateStatus(id, status)`: update status by id ✅
  - dùng cho cả cancel (→ "cancelled") và retry (→ "pending") ✅

### account.repo.ts
- à, nghĩa là `findAll()`: select * order created_at desc ✅
- à, nghĩa là `findAllWithStatus()`: select "platform, status" — cho platform health ✅

### proxy.repo.ts
- à, nghĩa là `findAll()`: select * + join account username → `assigned_account_alias` ✅
  - **Quyết định:** dùng 2 query parallel thay vì join SQL — Supabase PostgREST join cồng kềnh, data nhỏ ✅
- à, nghĩa là `createBulk(proxies[])`: insert array ✅
- à, nghĩa là `deleteById(id)`: delete eq id ✅
- à, nghĩa là `testConnection(id)`: update status + last_used_at ✅
  - **Lưu ý:** hiện tại `testProxyConnection` dùng `Math.random()` → giữ nguyên logic tạm, comment TODO cho real test ✅

### audit.repo.ts
- à, nghĩa là gộp 2 table `audit_logs` + `exported_files` vì cùng nhóm system:
  - `getAuditLogs()`: select * order desc limit 100 ✅
  - `logEvent(log)`: insert ✅
  - `getExports()`: select * order desc ✅
  - `logExport(file)`: insert ✅

### comment.repo.ts
- à, nghĩa là `findByPostId(postId)`: select * eq post_id order created_at asc limit 100 ✅

### log.repo.ts  
- à, nghĩa là `findByTaskId(taskId)`: select * eq task_id order created_at asc limit 200 ✅

---

## 2. Service Layer

### dashboard.service.ts
- à, nghĩa là phải tạo mới Supabase client mỗi lần gọi — `const db = await createClientServer()`
  - **Vì sao?** Next.js Server Component cần `cookies()` context mới mỗi request ✅
- à, nghĩa là `getDashboardMetrics()`:
  - 4 parallel: postRepo.count(), authorRepo.count(), taskRepo.findAll(), accountRepo.findAll()
  - trend = 0 (chưa có logic so sánh tuần trước, để TODO) ✅
- à, nghĩa là `getPlatformDistribution()`:
  - postRepo.countByPlatform() → map sang `{ platform, count, color }`
  - **color map** giữ nguyên hardcode ở service (không phải repo concern) ✅
- à, nghĩa là `getPostsPerDay()`: postRepo.countByDay(7) ✅
- à, nghĩa là `getPlatformHealth()`: accountRepo.findAllWithStatus() → aggregate ✅

### data.service.ts
- à, nghĩa là `getPosts(filters)`: postRepo.findMany → map row → CrawledPost ✅
  - **Map logic** chuyển từ `mapDbPost()` ở api.ts hiện tại — stats.digg_count || stats.like_count ✅
- à, nghĩa là `getAuthors(filters)`: authorRepo.findMany → map → CrawledAuthor ✅
- à, nghĩa là `getComments(postId)`: commentRepo.findByPostId → map ✅
- à, nghĩa là `getTags()`: **QUYẾT ĐỊNH** — hiện tại getTags() trả mock cứng, chưa có bảng tags
  - → Trả `[]` + comment TODO "cần migration bảng post_tags" ✅

### creative.service.ts
- à, nghĩa là **QUAN TRỌNG** — creative pages hiện dùng 2 kiểu:
  - Page: import mock trực tiếp `from "@/lib/mock-data"` (6 page files)
  - api.ts: gọi `/api/creative/*` routes → route gọi `createClientServer()`
- à, nghĩa là service sẽ gọi TRỰC TIẾP repository (không qua HTTP fetch nữa) ✅
  - Phase 2 sẽ chuyển page sang Server Component gọi service
  - Phase 3 sẽ refactor API Route gọi service cho interactive client components
- à, nghĩa là `searchAds(opts)`: postRepo.findMany with filters + authorRepo join ✅
  - **Map logic** chuyển từ route.ts: stats → flat fields, views_history mock tạm ✅
- à, nghĩa là `getAdvertisers()`: authorRepo.findMany + count posts per author ✅
  - **Quyết định:** dùng 2 query (authors + countByAuthor) thay vì RPC — data nhỏ ✅

### crawler.service.ts
- à, nghĩa là `getTasks()`: taskRepo.findAll → map ✅
- à, nghĩa là `createTask(input)`: validate + taskRepo.create ✅
- à, nghĩa là `cancelTask(id)`: taskRepo.updateStatus(id, "cancelled") ✅
- à, nghĩa là `retryTask(id)`: taskRepo.updateStatus(id, "pending") ✅
- à, nghĩa là `getTaskLogs(taskId)`: logRepo.findByTaskId → map ✅
- à, nghĩa là `getAccounts()`: accountRepo.findAll ✅

### system.service.ts
- à, nghĩa là settings GIỮỞ localStorage (đã migrate sang client storage ở initiative trước) ✅
  - `getSettings()`, `saveSettings()` — logic y hệt hiện tại, chỉ chuyển sang service ✅
- à, nghĩa là `getAuditLogs()`: auditRepo.getAuditLogs ✅
- à, nghĩa là `getProxies()`: proxyRepo.findAll ✅
- à, nghĩa là `getExports()`: auditRepo.getExports ✅

---

## 3. Realtime

### lib/realtime/subscriptions.ts
- à, nghĩa là import `createClientBrowser` từ `lib/supabase/client.ts` ✅
- à, nghĩa là `subscribeToTasks(onUpdate, onInsert)`: y hệt hiện tại ✅
- à, nghĩa là `subscribeToTaskLogs(taskId, onNewLog)`: y hệt hiện tại ✅
- à, nghĩa là **ĐÂY LÀ FILE DUY NHẤT** import browser Supabase client ✅

---

## 4. Xoá files

### lib/api.ts (896 dòng)
- à, nghĩa là xoá SAU khi tất cả service + repo đã xong ✅
- à, nghĩa là phải grep tất cả import từ `@/lib/api` và chuyển sang import service tương ứng ✅
  - **Nhưng CHƯA sửa page component** — để Phase 2 ✅
  - Phase 1: chỉ tạo service, CHƯA xoá api.ts (vì page vẫn đang import nó)
  - → **ĐIỀU CHỈNH:** api.ts sẽ được chuyển thành re-export wrapper tạm từ services — phase 2 mới xoá hẳn ✅

### lib/supabase.ts (singleton)
- à, nghĩa là xoá SAU khi không còn ai import nó ✅
- à, nghĩa là `lib/api.ts` wrapper tạm sẽ dùng createClientServer thay vì singleton ✅
  - **VẤN ĐỀ:** api.ts chạy ở client ("use client" pages) → không gọi được createClientServer()
  - → **QUYẾT ĐỊNH QUAN TRỌNG:** Phase 1 GIỮNGUYÊN `lib/supabase.ts` singleton. Chỉ xoá ở Phase 2 khi page chuyển sang Server Component. Phase 1 tập trung vào tạo repositories + services mới, KHÔNG phá page hiện tại. ✅

### lib/mock-data.ts (597 dòng)
- à, nghĩa là xoá SAU khi không còn import ✅
- à, nghĩa là 9 file import mock-data:
  - Header.tsx, 6 creative pages, home page, management page
- → **ĐIỀU CHỈNH:** Phase 1 CHƯA xoá mock-data.ts — để Phase 2 khi migrate pages ✅

---

## 5. Quyết định quan trọng (tổng hợp)

| # | Quyết định | Lý do |
|---|-----------|-------|
| D1 | Repository nhận `SupabaseClient` qua constructor, không import global | Testable, không phụ thuộc runtime context |
| D2 | Service tạo `createClientServer()` mỗi lần gọi | Next.js cần cookies context mới mỗi request |
| D3 | Giữ `lib/supabase.ts` singleton ở Phase 1 | Page hiện tại là "use client", cần singleton. Xoá ở Phase 2 |
| D4 | Giữ `lib/mock-data.ts` ở Phase 1 | 9 file page đang import. Xoá ở Phase 2 khi migrate page |
| D5 | Giữ `lib/api.ts` ở Phase 1 nhưng thêm deprecation comment | Page đang import. Service mới song song, phase 2 migrate |
| D6 | Realtime tách riêng `lib/realtime/subscriptions.ts` | File duy nhất cần browser client, tách rõ concern |
| D7 | Không dùng Supabase RPC/View cho aggregation | Data < 10k row, giữ đơn giản, client-side aggregate đủ nhanh |

## Trạng thái

- ✅ Tất cả nhánh đã đào tận đáy
- ✅ Không còn "mặc định cho qua"
