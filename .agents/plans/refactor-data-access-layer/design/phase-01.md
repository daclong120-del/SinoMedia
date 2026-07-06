# Phase 1 — Foundation: Repository + Service Layer + Xoá mock

## Phân tích hiện trạng

### Danh sách tất cả hàm trong `lib/api.ts` (896 dòng)

| Nhóm | Hàm | Gọi DB bằng | Fallback |
|------|------|-------------|----------|
| **Posts** | `fetchPosts()` | `supabase.from("crawled_posts")` (client) | `mockPosts` |
| **Authors** | `fetchAuthors()` | `supabase.from("crawled_authors")` (client) | `mockAuthors` |
| **Tasks** | `fetchTasks()` | `supabase.from("crawler_tasks")` (client) | `mockTasks` |
| **Tasks** | `createTask()` | `supabase.from("crawler_tasks").insert` (client) | - |
| **Tasks** | `cancelTask()` | `supabase.from("crawler_tasks").update` (client) | - |
| **Tasks** | `retryTask()` | `supabase.from("crawler_tasks").update` (client) | - |
| **Comments** | `fetchComments()` | `supabase.from("crawled_comments")` (client) | `[]` |
| **Metrics** | `fetchDashboardMetrics()` | 4x parallel queries (client) | `homeMetrics` |
| **Metrics** | `fetchPlatformDistribution()` | `crawled_posts.platform` (client) | `platformDistribution` |
| **Metrics** | `getPostsPerDay()` | `crawled_posts.published_at` (client) | `postsPerDay` |
| **Metrics** | `getPlatformHealth()` | `crawler_accounts` (client) | `platformHealth` |
| **Logs** | `fetchTaskLogs()` | `supabase.from("crawler_logs")` (client) | `[]` |
| **Realtime** | `subscribeToTasks()` | `supabase.channel()` (client) | - |
| **Realtime** | `subscribeToTaskLogs()` | `supabase.channel()` (client) | - |
| **Proxies** | `getProxies()` | `crawler_proxies + crawler_accounts` (client) | `mockProxies` |
| **Proxies** | `createProxiesBulk()` | `crawler_proxies.insert` (client) | throw |
| **Proxies** | `deleteProxy()` | `crawler_proxies.delete` (client) | throw |
| **Proxies** | `testProxyConnection()` | `crawler_proxies.update` (client) | throw |
| **Audit** | `getAuditLogs()` | `audit_logs` (client) | `mockAuditLogs` |
| **Audit** | `logAuditEvent()` | `audit_logs.insert` (client) | - |
| **Export** | `getExportedFiles()` | `exported_files` (client) | `mockExportedFiles` |
| **Export** | `logExportedFile()` | `exported_files.insert` (client) | throw |
| **Settings** | `getSystemSettings()` | `localStorage` | `DEFAULT_SETTINGS` |
| **Settings** | `saveSystemSettings()` | `localStorage` | throw |
| **Creative** | `getCreativeAdvertisers()` | `fetch("/api/creative/advertisers")` (HTTP) | `mockCreativeAdvertisers` |
| **Creative** | `getCreativeAds()` | `fetch("/api/creative/search")` (HTTP) | `mockCreativeAds` |
| **Creative** | `getCreativeAdById()` | `fetch("/api/creative/{id}")` (HTTP) | `mockCreativeAds` |
| **Creative** | `getCreativeAdvertiserById()` | `fetch("/api/creative/advertisers/{id}")` (HTTP) | `mockCreativeAdvertisers` |
| **Creative** | `getSimilarCreatives()` | `fetch("/api/creative/search")` (HTTP) | `mockCreativeAds` |
| **Static** | `getConsoleLogs()` | trả mock cứng | `mockConsoleLogs` |
| **Static** | `getTags()` | trả mock cứng | `mockTags` |
| **Static** | `getPermissions()` | trả mock cứng | `mockPermissions` |

**Tổng: 30 hàm — 3 kiểu truy vấn khác nhau (supabase client / fetch API Route / localStorage / mock cứng)**

### Realtime — phải giữ browser client
`subscribeToTasks()` và `subscribeToTaskLogs()` dùng Supabase Realtime channel. Đây là feature cần chạy trên browser → phải giữ `lib/supabase/client.ts` cho realtime subscriptions.

## Thiết kế Repository + Service Layer

### Cấu trúc thư mục mới

```
dashboard/lib/
├── supabase/
│   ├── server.ts        ← GIỮ NGUYÊN (SSR Supabase client cho Server Components + API Routes)
│   ├── client.ts        ← GIỮ NGUYÊN (Browser client CHỈ cho Realtime)
│   └── middleware.ts    ← GIỮ NGUYÊN
├── repositories/        ← MỚI — tầng duy nhất chạm DB
│   ├── post.repo.ts     ← crawled_posts queries
│   ├── author.repo.ts   ← crawled_authors queries  
│   ├── task.repo.ts     ← crawler_tasks queries
│   ├── account.repo.ts  ← crawler_accounts queries
│   ├── proxy.repo.ts    ← crawler_proxies queries
│   ├── audit.repo.ts    ← audit_logs + exported_files queries
│   ├── comment.repo.ts  ← crawled_comments queries
│   └── log.repo.ts      ← crawler_logs queries
├── services/            ← MỚI — business logic, compose repos
│   ├── dashboard.service.ts  ← metrics, platform health, posts per day
│   ├── data.service.ts       ← posts, authors, comments (data management pages)
│   ├── creative.service.ts   ← creative ads, advertisers, trending, growth
│   ├── crawler.service.ts    ← tasks, accounts, logs (crawler management pages)
│   └── system.service.ts     ← settings, audit logs, exports, proxies
├── realtime/            ← MỚI — tách riêng Realtime subscriptions
│   └── subscriptions.ts ← subscribeToTasks(), subscribeToTaskLogs()
├── platform-config.ts  ← GIỮ NGUYÊN
├── utils.ts             ← GIỮ NGUYÊN
├── utils/               ← GIỮ NGUYÊN
├── stores/              ← GIỮ NGUYÊN
├── account-context.tsx  ← GIỮ NGUYÊN
├── csrf.ts              ← GIỮ NGUYÊN
└── ❌ api.ts            ← XOÁ (896 dòng → thay bằng repositories + services)
    ❌ supabase.ts       ← XOÁ (singleton → thay bằng supabase/server.ts)
    ❌ mock-data.ts      ← XOÁ (597 dòng mock cứng)
```

### Pattern Repository

Mỗi repository nhận `SupabaseClient` qua tham số → không phụ thuộc global singleton → test được.

```typescript
// Ví dụ: lib/repositories/post.repo.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export class PostRepository {
  constructor(private db: SupabaseClient) {}

  async findMany(opts: { platform?: string; search?: string; limit?: number; offset?: number }) {
    let query = this.db.from("crawled_posts").select("*", { count: "exact" })
      .order("crawled_at", { ascending: false })
      .limit(opts.limit ?? 50);
    if (opts.platform) query = query.eq("platform", opts.platform);
    if (opts.search) query = query.ilike("caption", `%${opts.search}%`);
    if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
    return query;
  }

  async countByPlatform() { ... }
  async countByDay(days: number) { ... }
}
```

### Pattern Service

Service tổng hợp nhiều repository, xử lý business logic:

```typescript
// Ví dụ: lib/services/dashboard.service.ts
import { createClientServer } from "@/lib/supabase/server";
import { PostRepository } from "@/lib/repositories/post.repo";
import { AuthorRepository } from "@/lib/repositories/author.repo";
import { TaskRepository } from "@/lib/repositories/task.repo";
import { AccountRepository } from "@/lib/repositories/account.repo";

export async function getDashboardMetrics() {
  const db = await createClientServer();
  const postRepo = new PostRepository(db);
  const authorRepo = new AuthorRepository(db);
  const taskRepo = new TaskRepository(db);
  const accountRepo = new AccountRepository(db);

  const [totalPosts, totalAuthors, tasks, accounts] = await Promise.all([
    postRepo.count(),
    authorRepo.count(),
    taskRepo.findAll(),
    accountRepo.findAll(),
  ]);

  return {
    totalPosts,
    totalAuthors,
    runningTasks: tasks.filter(t => t.status === "running").length,
    pendingTasks: tasks.filter(t => t.status === "pending").length,
    activeAccounts: accounts.filter(a => a.status === "active").length,
    totalAccounts: accounts.length,
    postsTrend: 0,
    authorsTrend: 0,
  };
}
```

### Xử lý mock fallback

**Xoá hoàn toàn pattern `catch → return mock`.** Thay bằng:
- Nếu DB lỗi → throw → page hiển thị error state chuẩn
- Nếu DB rỗng → trả `[]` / `0` — UI hiển thị empty state

### Realtime — tách riêng

`lib/realtime/subscriptions.ts` import `createClientBrowser()` — file DUY NHẤT dùng browser client.

## Deliverables cụ thể

1. ✅ `lib/repositories/post.repo.ts` — findMany, count, countByPlatform, countByDay
2. ✅ `lib/repositories/author.repo.ts` — findMany, count
3. ✅ `lib/repositories/task.repo.ts` — findAll, create, cancel, retry
4. ✅ `lib/repositories/account.repo.ts` — findAll
5. ✅ `lib/repositories/proxy.repo.ts` — findAll, createBulk, delete, testConnection
6. ✅ `lib/repositories/audit.repo.ts` — getLogs, logEvent, getExports, logExport
7. ✅ `lib/repositories/comment.repo.ts` — findByPostId
8. ✅ `lib/repositories/log.repo.ts` — findByTaskId
9. ✅ `lib/services/dashboard.service.ts` — getDashboardMetrics, getPlatformDistribution, getPostsPerDay, getPlatformHealth
10. ✅ `lib/services/data.service.ts` — getPosts, getAuthors, getComments, getTags
11. ✅ `lib/services/creative.service.ts` — searchAds, getAdById, getAdvertisers, getAdvertiserById, getTrending, getNew, getGrowth, getSimilar
12. ✅ `lib/services/crawler.service.ts` — getTasks, createTask, cancelTask, retryTask, getTaskLogs, getAccounts
13. ✅ `lib/services/system.service.ts` — getSettings, saveSettings, getAuditLogs, logAuditEvent, getProxies, createProxies, deleteProxy, testProxy, getExports, logExport
14. ✅ `lib/realtime/subscriptions.ts` — subscribeToTasks, subscribeToTaskLogs
15. ❌ Xoá `lib/api.ts`
16. ❌ Xoá `lib/supabase.ts`
17. ❌ Xoá `lib/mock-data.ts`
