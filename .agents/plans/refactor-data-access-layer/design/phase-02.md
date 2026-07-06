# Phase 2 — Migrate Pages: Chuyển imports sang Services

## Phân tích lại scope

### Vấn đề ban đầu
Plan gốc nói "chuyển 18 page từ `use client` → Server Component". Sau khi kiểm tra thực tế:

**Tất cả 18 page đều có interactive UI nặng:**
- `useState` cho filters, pagination, search, loading states
- `useEffect` cho data fetching khi filter thay đổi
- `onClick`, `onChange` handlers khắp nơi
- Một số page dùng `useSearchParams`, `useRouter`

→ **KHÔNG THỂ** chuyển page.tsx thành Server Component thuần mà không rewrite toàn bộ UI logic.

### Chiến lược thực tế (điều chỉnh)

**Thay vì rewrite 18 page → chỉ THAY IMPORT SOURCE:**
- Bỏ `import { ... } from "@/lib/api"` → `import { ... } from "@/lib/services/*"`
- Bỏ `import { ... } from "@/lib/mock-data"` → xoá mock, dùng service trực tiếp
- Giữ nguyên `"use client"` và UI logic

**Lý do:** 
- Blast radius nhỏ — chỉ đổi dòng import, không đổi UI
- Build vẫn pass — service functions có cùng signature
- Xong phase này → `api.ts` và `mock-data.ts` không còn ai import → xoá được

### VẤN ĐỀ KỸ THUẬT QUAN TRỌNG

Services dùng `createClientServer()` → đọc `cookies()` → **CHỈ chạy được ở server-side**. 

Nhưng 18 page đều là `"use client"` → chạy ở **browser** → KHÔNG gọi được `createClientServer()`.

**→ Giải pháp: 2 bước:**

1. **Bước A (Phase 2):** Page `"use client"` gọi service qua **API Route wrapper** hoặc **Server Action** thay vì gọi supabase trực tiếp
2. **Bước B (tương lai):** Dần chuyển page sang Server Component khi có thời gian

**Cụ thể cho Phase 2 — dùng Server Actions:**

```typescript
// lib/actions/dashboard.actions.ts ("use server")
"use server";
import { getDashboardMetrics } from "@/lib/services/dashboard.service";
export { getDashboardMetrics };

// Page vẫn "use client", gọi Server Action:
import { getDashboardMetrics } from "@/lib/actions/dashboard.actions";
// useEffect(() => { getDashboardMetrics().then(setMetrics); }, []);
```

**Ưu điểm Server Actions:**
- Page giữ nguyên `"use client"` + UI logic
- Data vẫn đi qua server (không lộ ANON_KEY)
- Signature giống hệt → chỉ đổi import path
- Không cần tạo thêm API Route mới

## Deliverables

### Nhóm 1: Server Actions wrapper (5 files)
- `lib/actions/dashboard.actions.ts` — re-export dashboard.service
- `lib/actions/data.actions.ts` — re-export data.service
- `lib/actions/creative.actions.ts` — re-export creative.service
- `lib/actions/crawler.actions.ts` — re-export crawler.service
- `lib/actions/system.actions.ts` — re-export system.service

### Nhóm 2: Migrate page imports (18 pages + 2 components)

| # | Page | Import cũ | Import mới |
|---|------|-----------|------------|
| 1 | `home/page.tsx` | `api.ts` + `mock-data.ts` | `dashboard.actions` |
| 2 | `data/posts/page.tsx` | `api.ts` | `data.actions` |
| 3 | `data/authors/page.tsx` | `api.ts` | `data.actions` |
| 4 | `data/management/page.tsx` | `api.ts` + `mock-data.ts` | `data.actions` + `system.actions` |
| 5 | `creative/search/page.tsx` | `mock-data.ts` | `creative.actions` |
| 6 | `creative/trending/page.tsx` | `api.ts` | `creative.actions` |
| 7 | `creative/new/page.tsx` | `mock-data.ts` | `creative.actions` |
| 8 | `creative/growth/page.tsx` | `mock-data.ts` | `creative.actions` |
| 9 | `creative/advertisers/page.tsx` | `mock-data.ts` | `creative.actions` |
| 10 | `creative/advertisers/[id]/page.tsx` | `mock-data.ts` | `creative.actions` |
| 11 | `creative/[id]/page.tsx` | (dùng CreativeDetailView) | `creative.actions` |
| 12 | `creative/calendar/page.tsx` | (không import api/mock) | giữ nguyên |
| 13 | `tasks/page.tsx` | `api.ts` | `crawler.actions` + `realtime/subscriptions` |
| 14 | `accounts/page.tsx` | `api.ts` | `crawler.actions` |
| 15 | `proxies/page.tsx` | `api.ts` | `system.actions` |
| 16 | `settings/page.tsx` | `api.ts` | `system.actions` |
| 17 | `audit-logs/page.tsx` | `api.ts` | `system.actions` |
| 18 | `manage-account/members/page.tsx` | (không import api/mock) | giữ nguyên |

Components:
| # | Component | Import cũ | Import mới |
|---|-----------|-----------|------------|
| 19 | `Header.tsx` | `mock-data.ts` | `creative.actions` |
| 20 | `CreativeDetailView.tsx` | `api.ts` | `creative.actions` |

### Nhóm 3: Xoá files cũ
- ❌ `lib/api.ts` (896 dòng)
- ❌ `lib/mock-data.ts` (597 dòng)
- ❌ `lib/supabase.ts` (singleton — nếu không còn ai import)

## Quyết định

| # | Quyết định | Lý do |
|---|-----------|-------|
| D1 | Dùng Server Actions thay vì rewrite page → Server Component | Giữ nguyên UI, chỉ đổi data source. Blast radius nhỏ nhất. |
| D2 | Giữ nguyên `"use client"` trên tất cả page | Rewrite 18 page quá rủi ro, UI đã ổn định. Server Actions vẫn chạy server-side. |
| D3 | Realtime giữ nguyên import từ `lib/realtime/subscriptions.ts` | Realtime phải chạy browser-side, đã tách ở Phase 1. |
