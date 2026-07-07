# 🏗️ Architecture — Frontend Dashboard ↔ Supabase

## 1. Tổng quan kết nối

Dashboard (Next.js 16) giao tiếp với Supabase qua **2 giao thức**:

| Giao thức | Dùng cho | Client |
|-----------|----------|--------|
| **PostgREST HTTP** | CRUD data (đọc/ghi bảng) | `@supabase/ssr` → `createServerClient()` |
| **WebSocket Realtime** | Lắng nghe thay đổi data live | `@supabase/ssr` → `createBrowserClient()` |

---

## 2. Kiến trúc CŨ (trước refactor) — ❌ Hỗn loạn

```mermaid
graph TB
    subgraph "Browser (Client-side)"
        P1["Page ('use client')"]
        P2["Page ('use client')"]
        P3["Creative Page"]
    end

    subgraph "lib/"
        API["api.ts (896 dòng monolith)"]
        MOCK["mock-data.ts (597 dòng)"]
        SB1["supabase.ts (singleton)"]
        SB2["supabase/client.ts"]
        SB3["supabase/server.ts"]
    end

    subgraph "app/api/"
        R1["creative/search/route.ts"]
        R2["creative/[id]/route.ts"]
        R3["creative/advertisers/route.ts"]
    end

    subgraph "Supabase"
        DB["PostgreSQL DB"]
        RT["Realtime (WebSocket)"]
    end

    P1 -->|"import fetchPosts()"| API
    P2 -->|"import fetchTasks()"| API
    P3 -->|"fetch('/api/creative/...')"| R1

    API -->|"gọi trực tiếp"| SB1
    API -->|"fallback"| MOCK
    API -->|"Realtime subscribe"| SB2

    R1 -->|"SSR query"| SB3
    R2 -->|"SSR query"| SB3
    R3 -->|"SSR query"| SB3
    R1 -->|"fallback"| MOCK

    SB1 -->|"ANON_KEY lộ ra browser ⚠️"| DB
    SB2 --> RT
    SB3 -->|"cookie-based auth"| DB

    style MOCK fill:#ff6b6b,color:#fff
    style SB1 fill:#ff6b6b,color:#fff
    style API fill:#ffa726,color:#fff
```

**Vấn đề chính:**
- `api.ts` gọi `supabase.ts` singleton → **ANON_KEY lộ ra browser**
- 3 Supabase client cùng tồn tại, page nào dùng cái nào là tuỳ hứng
- Lỗi DB → fallback mock → **che giấu lỗi thật**
- Không có tầng trung gian → page coupling trực tiếp với DB schema

---

## 3. Kiến trúc MỚI (đang refactor) — ✅ Repository + Service Layer

```mermaid
graph TB
    subgraph "Browser"
        SC["Server Component (page.tsx)"]
        CC["Client Component (interactive UI)"]
    end

    subgraph "Next.js Server"
        subgraph "Services (business logic)"
            DS["dashboard.service.ts"]
            DTS["data.service.ts"]
            CS["creative.service.ts"]
            CRS["crawler.service.ts"]
            SS["system.service.ts"]
        end

        subgraph "Repositories (DB access)"
            PR["post.repo.ts"]
            AR["author.repo.ts"]
            TR["task.repo.ts"]
            ACR["account.repo.ts"]
            PXR["proxy.repo.ts"]
            AUR["audit.repo.ts"]
            CR["comment.repo.ts"]
            LR["log.repo.ts"]
        end

        subgraph "API Routes (chỉ cho interactive actions)"
            API1["POST /api/tasks"]
            API2["POST /api/proxy"]
        end

        SBS["supabase/server.ts"]
    end

    subgraph "Realtime (Browser-only)"
        RTS["realtime/subscriptions.ts"]
        SBC["supabase/client.ts"]
    end

    subgraph "Supabase"
        DB["PostgreSQL DB"]
        RT["Realtime WebSocket"]
    end

    SC -->|"gọi trực tiếp (server-side)"| DS
    SC --> DTS
    SC --> CS
    CC -->|"fetch POST"| API1
    CC -->|"fetch POST"| API2
    CC -->|"subscribe"| RTS

    API1 --> CRS
    API2 --> SS

    DS --> PR
    DS --> AR
    DS --> TR
    DS --> ACR
    DTS --> PR
    DTS --> AR
    DTS --> CR
    CS --> PR
    CS --> AR
    CRS --> TR
    CRS --> LR
    CRS --> ACR
    SS --> PXR
    SS --> AUR

    PR --> SBS
    AR --> SBS
    TR --> SBS
    ACR --> SBS
    PXR --> SBS
    AUR --> SBS
    CR --> SBS
    LR --> SBS

    SBS -->|"cookie-based SSR auth"| DB
    RTS --> SBC
    SBC --> RT

    style DS fill:#4caf50,color:#fff
    style DTS fill:#4caf50,color:#fff
    style CS fill:#4caf50,color:#fff
    style CRS fill:#4caf50,color:#fff
    style SS fill:#4caf50,color:#fff
    style SBS fill:#2196f3,color:#fff
    style SBC fill:#ff9800,color:#fff
```

---

## 4. Luồng Request chi tiết

### 4.1 Đọc data (Server Component — không lộ key)

```
Browser GET /dash/home
  → Next.js render Server Component (page.tsx)
    → gọi getDashboardMetrics() [dashboard.service.ts]
      → tạo db = createClientServer() [supabase/server.ts — đọc cookies]
      → new PostRepository(db).count()
        → db.from("crawled_posts").select("id", { count: "exact", head: true })
          → HTTP POST https://127.0.0.1:54321/rest/v1/crawled_posts
            Headers: { apikey: ANON_KEY, Authorization: Bearer <JWT từ cookie> }
          ← { count: 140 }
      → new AuthorRepository(db).count() [song song]
      → new TaskRepository(db).findAllWithStatus() [song song]
      → new AccountRepository(db).findAll() [song song]
    ← { totalPosts: 140, totalAuthors: 16, runningTasks: 0, ... }
  → render HTML với data → trả về browser
```

### 4.2 Ghi data (Client Component → API Route → Service)

```
Browser: User bấm "Tạo Task"
  → Client Component POST /api/tasks { platform: "douyin", command: "search", target: "美妆" }
    → API Route handler
      → gọi createTask() [crawler.service.ts]
        → tạo db = createClientServer()
        → new TaskRepository(db).create({ ... })
          → db.from("crawler_tasks").insert([...]).select().single()
          ← { id: "uuid-xxx", status: "pending", ... }
    ← JSON response → Client Component cập nhật UI
```

### 4.3 Realtime (Browser WebSocket — file duy nhất dùng browser client)

```
Browser: Trang Tasks mount
  → import { subscribeToTasks } from "lib/realtime/subscriptions"
    → createClientBrowser() [supabase/client.ts — ANON_KEY ở browser, CHỈ cho Realtime]
    → supabase.channel("tasks-realtime")
      .on("postgres_changes", { event: "UPDATE", table: "crawler_tasks" }, callback)
      .subscribe()
    → WebSocket wss://127.0.0.1:54321/realtime/v1/websocket
  
  Khi crawler-pipeline cập nhật task status:
    ← WebSocket message: { new: { id: "uuid-xxx", status: "running" } }
    → callback(task) → UI re-render không cần refresh
```

---

## 5. Mapping: Page → Service → Repository → DB Table

| Trang Dashboard | Service | Repository | Bảng Supabase |
|-----------------|---------|------------|---------------|
| `/dash/home` | `dashboard.service` | `post.repo` `author.repo` `task.repo` `account.repo` | `crawled_posts` `crawled_authors` `crawler_tasks` `crawler_accounts` |
| `/dash/data/posts` | `data.service` | `post.repo` | `crawled_posts` |
| `/dash/data/authors` | `data.service` | `author.repo` | `crawled_authors` |
| `/dash/data/management` | `data.service` | `post.repo` | `crawled_posts` |
| `/dash/creative/search` | `creative.service` | `post.repo` `author.repo` | `crawled_posts` `crawled_authors` |
| `/dash/creative/trending` | `creative.service` | `post.repo` | `crawled_posts` |
| `/dash/creative/new` | `creative.service` | `post.repo` | `crawled_posts` |
| `/dash/creative/growth` | `creative.service` | `post.repo` | `crawled_posts` |
| `/dash/creative/advertisers` | `creative.service` | `author.repo` `post.repo` | `crawled_authors` `crawled_posts` |
| `/dash/creative/[id]` | `creative.service` | `post.repo` `author.repo` | `crawled_posts` `crawled_authors` |
| `/dash/tasks` | `crawler.service` | `task.repo` `log.repo` | `crawler_tasks` `crawler_logs` |
| `/dash/accounts` | `crawler.service` | `account.repo` | `crawler_accounts` |
| `/dash/proxies` | `system.service` | `proxy.repo` | `crawler_proxies` `crawler_accounts` |
| `/dash/audit-logs` | `system.service` | `audit.repo` | `audit_logs` |
| `/dash/settings` | `system.service` | — | `localStorage` |

---

## 6. Supabase Client — Ai dùng cái nào

| File | Loại | Chạy ở đâu | Ai import |
|------|------|-------------|-----------|
| `lib/supabase/server.ts` | `createServerClient()` từ `@supabase/ssr` | **Server only** (Server Components, API Routes) | Tất cả Services (qua Repository constructor) |
| `lib/supabase/client.ts` | `createBrowserClient()` từ `@supabase/ssr` | **Browser only** | **DUY NHẤT** `lib/realtime/subscriptions.ts` |
| `lib/supabase/middleware.ts` | Refresh session cookie | **Middleware** (edge) | `middleware.ts` |

> [!IMPORTANT]
> **ANON_KEY** chỉ lộ ra browser qua `supabase/client.ts` — và file duy nhất import nó là `realtime/subscriptions.ts` (cho WebSocket). Tất cả CRUD data đều đi qua server → key không bao giờ lộ.

---

## 7. Database Schema (10 bảng)

```mermaid
erDiagram
    crawled_posts {
        uuid id PK
        text platform
        text platform_id
        uuid author_id FK
        text caption
        text cover_url
        jsonb stats
        jsonb raw
        text[] media_urls
        text[] tags
        timestamptz published_at
        timestamptz crawled_at
    }

    crawled_authors {
        uuid id PK
        text platform
        text platform_uid
        text nickname
        text avatar_url
        text gender
        text description
        int fans_count
        int follows_count
        text ip_location
        timestamptz created_at
        timestamptz updated_at
    }

    crawled_comments {
        uuid id PK
        uuid post_id FK
        text parent_cid
        text content
        int like_count
        text author_nickname
        timestamptz crawled_at
    }

    crawler_tasks {
        uuid id PK
        text platform
        text command
        text target
        text status
        text priority
        jsonb metadata
        timestamptz scheduled_at
        timestamptz created_at
    }

    crawler_accounts {
        uuid id PK
        text platform
        text username
        text status
        int failure_count
        timestamptz last_used_at
        timestamptz created_at
    }

    crawler_logs {
        bigint id PK
        uuid task_id FK
        text level
        text message
        timestamptz created_at
    }

    crawler_proxies {
        uuid id PK
        text host
        int port
        text protocol
        text status
        uuid assigned_account_id FK
        timestamptz last_used_at
        timestamptz created_at
    }

    audit_logs {
        uuid id PK
        text actor_id
        text action
        text entity_type
        text entity_id
        jsonb payload
        text ip_address
        timestamptz created_at
    }

    exported_files {
        uuid id PK
        text filename
        text type
        jsonb filter_snapshot
        bigint size_bytes
        text created_by
        text download_url
        timestamptz created_at
    }

    crawled_posts ||--o{ crawled_comments : "post_id"
    crawled_authors ||--o{ crawled_posts : "author_id"
    crawler_tasks ||--o{ crawler_logs : "task_id"
    crawler_accounts ||--o| crawler_proxies : "assigned_account_id"
```
