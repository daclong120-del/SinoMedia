# Plan fix lỗi frontend khi Supabase local offline

Ngày lập: 2026-07-07  
Phạm vi: `dashboard/` của SinoMedia  
Mục tiêu: sửa lỗi runtime/console khiến trang Next.js 16 bị overlay đỏ, sidebar nhìn như không bấm được, và các trang dashboard bị nghẽn khi Supabase local/Docker chưa chạy.

---

## 1. Tóm tắt vấn đề hiện tại

Người dùng đang gặp các lỗi sau khi mở frontend ở `http://localhost:3000/`:

```txt
Runtime Error
{message: ..., details: ..., hint: "", code: ...}

Console AuthRetryableFetchError
Failed to fetch

Console TypeError
Failed to fetch
at chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/...

Console Error
getPostsPerDay timed out
at lib/services/dashboard.service.ts:81:45
```

Triệu chứng trên UI:

- Trang chính có thể render nhưng bấm sidebar sang trang khác đôi khi không đổi trang hoặc bị kẹt.
- Một số trang `/dash/...` bị 500 hoặc bị Next dev overlay khi Supabase local không chạy.
- Console bị nhiễu nhiều lỗi `Failed to fetch`, làm khó phân biệt lỗi app thật và lỗi môi trường.

Nguyên nhân chính cần fix:

1. Supabase local chưa chạy, nhưng một số service/action/client component vẫn gọi Supabase trong lúc render hoặc hydrate.
2. `withSupabaseTimeout()` trong các service đang timeout bằng cách `reject(new Error("${label} timed out"))`. Trong Next dev, lỗi này bị coi như runtime error/console error và hiện overlay đỏ.
3. Client page như `dashboard/app/(main)/dash/home/page.tsx` đang `console.error("Error loading home metrics:", err)`, khiến lỗi offline dự kiến bị đẩy lên dev overlay.
4. Middleware auth đã tối ưu một phần, nhưng cookie detection và `getUser()` timeout vẫn cần kiểm tra kỹ để không gọi Supabase khi không cần.
5. Lỗi stack `chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/...` nhiều khả năng đến từ Chrome extension chặn/intercept fetch, không phải code app. Khi test phải tắt extension/incognito để không chase sai bug.

---

## 2. Quy tắc bắt buộc trước khi sửa

Repo có `AGENTS.md` yêu cầu dùng GitNexus.

Trước khi sửa bất kỳ function/class/method nào, phải chạy GitNexus impact analysis cho symbol đó và ghi lại blast radius:

- direct callers
- affected processes/flows
- risk level

Các symbol tối thiểu cần impact trước khi đụng:

- `withSupabaseTimeout` trong:
  - `dashboard/lib/services/dashboard.service.ts`
  - `dashboard/lib/services/creative.service.ts`
  - `dashboard/lib/services/crawler.service.ts`
- `getPostsPerDay`
- `getDashboardMetrics`
- `getPlatformDistribution`
- `getPlatformHealth`
- `updateSession`
- component/page logic trong `dashboard/app/(main)/dash/home/page.tsx`

Nếu GitNexus impact tool không callable trong môi trường hiện tại, phải ghi rõ fallback đã dùng, ví dụ:

- `context({ name: "getPostsPerDay" })`
- `context({ name: "updateSession" })`
- `query({ search_query: "dashboard metrics Supabase timeout" })`

Sau khi sửa xong, phải chạy:

```txt
detect_changes({ repo: "SinoMedia", scope: "all" })
```

Không commit trong task này nếu người dùng chưa yêu cầu.

---

## 3. File cần kiểm tra/sửa

Ưu tiên theo thứ tự:

1. `dashboard/lib/services/dashboard.service.ts`
2. `dashboard/app/(main)/dash/home/page.tsx`
3. `dashboard/lib/services/creative.service.ts`
4. `dashboard/lib/services/crawler.service.ts`
5. `dashboard/lib/supabase/middleware.ts`
6. `dashboard/lib/actions/dashboard.actions.ts`
7. `dashboard/lib/actions/crawler.actions.ts` nếu có action gọi service crawler
8. Các page còn `console.error` khi load dữ liệu Supabase:
   - `dashboard/app/(main)/dash/data/posts/page.tsx`
   - `dashboard/app/(main)/dash/settings/page.tsx`
   - `dashboard/app/(main)/dash/creative/trending/page.tsx`
   - `dashboard/app/(main)/dash/data/management/page.tsx`
   - `dashboard/app/(main)/dash/proxies/page.tsx`

Lệnh audit nhanh:

```powershell
rg -n "withSupabaseTimeout|timed out|console\.error|Error loading|AuthRetryableFetchError|Failed to fetch|getPostsPerDay|updateSession|auth-token" dashboard\lib dashboard\app dashboard\proxy.ts
```

---

## 4. Thiết kế fix thống nhất

### 4.1. Không throw timeout cho lỗi offline dự kiến

Hiện tại service đang có dạng nguy hiểm:

```ts
async function withSupabaseTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), 1200);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
```

Vấn đề: `reject(new Error("getPostsPerDay timed out"))` là nguyên nhân trực tiếp của overlay/console error.

Thay bằng helper fail-soft không throw cho timeout:

```ts
type SupabaseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "timeout" | "offline" | "error"; error?: unknown };

function isDynamicServerUsageError(err: unknown): boolean {
  return typeof err === "object"
    && err !== null
    && "digest" in err
    && String((err as { digest?: unknown }).digest).includes("DYNAMIC_SERVER_USAGE");
}

async function withSupabaseTimeout<T>(
  run: () => Promise<T>,
  label: string,
  timeoutMs = 1200,
): Promise<SupabaseResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const value = await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject({ __supabaseTimeout: true, label });
        }, timeoutMs);
      }),
    ]);

    return { ok: true, value };
  } catch (err) {
    if (isDynamicServerUsageError(err)) {
      throw err;
    }

    const isTimeout = typeof err === "object"
      && err !== null
      && "__supabaseTimeout" in err;

    return {
      ok: false,
      reason: isTimeout ? "timeout" : "error",
      error: err,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
```

Quan trọng:

- Không dùng `new Error("${label} timed out")` cho path offline dự kiến.
- Nếu gặp Next dynamic server usage error thì vẫn phải rethrow, không được nuốt.
- `withSupabaseTimeout()` nên nhận `run: () => Promise<T>` thay vì nhận sẵn `promise`, để sau này có thể chặn bằng offline gate trước khi promise được tạo.

Có thể dùng thiết kế đơn giản hơn nếu muốn giữ signature:

```ts
async function withOfflineFallback<T>(
  label: string,
  fallback: T,
  run: () => Promise<T>,
  timeoutMs = 1200,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      run(),
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch (err) {
    if (isDynamicServerUsageError(err)) {
      throw err;
    }

    logSupabaseOffline(label, err);
    return fallback;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
```

Ưu tiên helper `withOfflineFallback()` vì các service hiện tại đều đã có fallback rõ ràng.

---

### 4.2. Logging: offline là warning có kiểm soát, không phải error

Tạo helper log trong từng service hoặc một file dùng chung server-only, ví dụ:

```ts
const offlineLogCache = new Set<string>();

function logSupabaseOffline(label: string, err: unknown): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (offlineLogCache.has(label)) {
    return;
  }

  offlineLogCache.add(label);
  console.warn(`[SupabaseOffline] ${label}; returning fallback`, {
    message: err instanceof Error ? err.message : String(err),
  });
}
```

Quy tắc:

- Lỗi offline/timeout expected: `console.warn` tối đa 1 lần mỗi label.
- Lỗi user-facing trong client page: không `console.error` nếu đã có fallback UI.
- Lỗi thật như mutation thất bại (`createTasksBulk`, save settings, login fail) vẫn được báo rõ, nhưng cần hiển thị bằng toast/message thay vì làm chết trang.

---

### 4.3. Dashboard service phải trả fallback sạch

File: `dashboard/lib/services/dashboard.service.ts`

Các hàm phải đảm bảo Supabase offline vẫn trả về dữ liệu trống hợp lệ:

- `getDashboardMetrics()`
- `getPlatformDistribution()`
- `getPostsPerDay()`
- `getPlatformHealth()`

Fallback đề xuất:

```ts
const EMPTY_DASHBOARD_METRICS = {
  totalPosts: 0,
  totalAuthors: 0,
  runningTasks: 0,
  activeAccounts: 0,
  totalAccounts: 0,
};

const EMPTY_PLATFORM_DISTRIBUTION: { name: string; value: number }[] = [];
const EMPTY_POSTS_PER_DAY: { date: string; count: number }[] = [];
const EMPTY_PLATFORM_HEALTH: PlatformHealth[] = [];
```

Ví dụ sửa `getPostsPerDay()`:

```ts
export async function getPostsPerDay(): Promise<{ date: string; count: number }[]> {
  return withOfflineFallback(
    "getPostsPerDay",
    [],
    () => postRepo.countByDay(7),
  );
}
```

Ví dụ sửa `getDashboardMetrics()`:

```ts
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return withOfflineFallback(
    "getDashboardMetrics",
    EMPTY_DASHBOARD_METRICS,
    async () => {
      const [totalPosts, totalAuthors, tasks, accounts] = await Promise.all([
        postRepo.count(),
        authorRepo.count(),
        taskRepo.findAll(),
        accountRepo.findAllWithStatus(),
      ]);

      return {
        totalPosts,
        totalAuthors,
        runningTasks: tasks.filter((task) => task.status === "running").length,
        activeAccounts: accounts.filter((account) => account.status === "active").length,
        totalAccounts: accounts.length,
      };
    },
  );
}
```

Điều cần tránh:

- Không còn bất kỳ `reject(new Error(... timed out))`.
- Không để raw Supabase error object `{ message, details, hint, code }` throw ra khỏi service cho page dashboard.
- Không nuốt `DYNAMIC_SERVER_USAGE`.

---

### 4.4. Home page không được `console.error` vì data load fallback

File: `dashboard/app/(main)/dash/home/page.tsx`

Hiện đang có dấu vết:

```ts
console.error("Error loading home metrics:", err);
```

Sửa theo hướng:

1. Dùng default state ban đầu là dữ liệu trống.
2. Dùng `Promise.allSettled()` thay vì `Promise.all()` nếu gọi nhiều server action/data loader.
3. Nếu một loader fail thì chỉ giữ fallback cho loader đó.
4. Không gọi `console.error` cho lỗi offline expected. Dùng `console.warn` có kiểm soát hoặc không log ở client.

Ví dụ pattern:

```ts
const [
  metricsResult,
  distributionResult,
  postsPerDayResult,
  healthResult,
] = await Promise.allSettled([
  getDashboardMetrics(),
  getPlatformDistribution(),
  getPostsPerDay(),
  getPlatformHealth(),
]);

setMetrics(metricsResult.status === "fulfilled" ? metricsResult.value : EMPTY_DASHBOARD_METRICS);
setPlatformDistribution(distributionResult.status === "fulfilled" ? distributionResult.value : []);
setPostsPerDay(postsPerDayResult.status === "fulfilled" ? postsPerDayResult.value : []);
setPlatformHealth(healthResult.status === "fulfilled" ? healthResult.value : []);
```

Nếu các hàm đang là server actions import vào client component, kiểm tra lại kiến trúc:

- Nếu đây là dữ liệu dashboard đơn giản, ưu tiên chuyển page thành Server Component wrapper rồi truyền dữ liệu xuống Client Component.
- Nếu vẫn giữ server action, action phải tự catch lỗi offline và trả fallback, không throw ra client.

---

### 4.5. Middleware auth không được gọi Supabase khi không có session thật

File: `dashboard/lib/supabase/middleware.ts`

Hiện đã có logic kiểm tra cookie dạng:

```ts
const hasAuthCookie = request.cookies.getAll().some(c =>
  c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
);
```

Cần sửa để nhận cả cookie chunked của Supabase:

```ts
function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-")
    && (name.includes("auth-token") || name.includes("auth-token."));
}
```

Hoặc an toàn hơn:

```ts
function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("auth-token");
}
```

Sau đó:

```ts
const hasAuthCookie = request.cookies.getAll().some((cookie) =>
  isSupabaseAuthCookie(cookie.name),
);
```

`supabase.auth.getUser()` phải có timeout fail-soft:

```ts
const userResult = await Promise.race([
  supabase.auth.getUser(),
  new Promise<{ data: { user: null }; error: null }>((resolve) => {
    setTimeout(() => resolve({ data: { user: null }, error: null }), 800);
  }),
]);
```

Nếu Supabase offline:

- public route vẫn load bình thường.
- protected route redirect về login hoặc giữ trạng thái unauthenticated theo rule hiện tại.
- không throw `AuthRetryableFetchError` từ middleware.

---

### 4.6. Chrome extension error không phải acceptance blocker của app

Stack này:

```txt
chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/libs/requests.js
chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js
```

đến từ extension đang intercept `fetch`.

Khi verify, bắt buộc test bằng một trong hai cách:

1. Chrome Incognito, tắt extension.
2. Browser profile sạch của Playwright/Chromium.
3. Temporarily disable extension ID `eppiocemhmnlbhjplcgkofciiegomcon`.

Không chase lỗi extension nếu stack không có frame nào thuộc `dashboard/`, `app/`, `lib/`, hoặc `localhost:3000`.

---

## 5. Các bước thực hiện chi tiết

### Bước 1: Reproduce lỗi trong môi trường offline

Đảm bảo Supabase local/Docker đang tắt.

Chạy frontend:

```powershell
cd D:\Python\SinoMedia\dashboard
npm.cmd run dev
```

Mở:

- `http://localhost:3000/`
- `http://localhost:3000/dash/home`
- `http://localhost:3000/dash/creative/search`
- `http://localhost:3000/dash/tasks`

Ghi lại:

- route nào hiện overlay
- console app có lỗi nào từ `dashboard/` hoặc `lib/`
- console nào là từ `chrome-extension://`

---

### Bước 2: Chạy GitNexus impact/context

Chạy impact cho các symbol sẽ sửa. Ghi kết quả vào log bàn giao.

Ví dụ mục tiêu:

```txt
impact({ target: "getPostsPerDay", direction: "upstream" })
impact({ target: "getDashboardMetrics", direction: "upstream" })
impact({ target: "updateSession", direction: "upstream" })
```

Nếu tool `impact` không có, dùng:

```txt
context({ name: "getPostsPerDay" })
context({ name: "getDashboardMetrics" })
context({ name: "updateSession" })
```

Nếu risk HIGH/CRITICAL: dừng lại báo người dùng trước khi sửa.

---

### Bước 3: Sửa timeout helper trong services

Sửa ở 3 file:

- `dashboard/lib/services/dashboard.service.ts`
- `dashboard/lib/services/creative.service.ts`
- `dashboard/lib/services/crawler.service.ts`

Yêu cầu sau sửa:

- Không còn `reject(new Error(`${label} timed out`))`.
- Không còn string `"getPostsPerDay timed out"` có thể throw ra runtime.
- Timeout trả fallback hoặc result object.
- Service tự catch Supabase offline và trả dữ liệu trống.
- Vẫn rethrow `DYNAMIC_SERVER_USAGE`.

Audit sau khi sửa:

```powershell
rg -n "reject\(new Error|timed out|withSupabaseTimeout" dashboard\lib\services
```

Kỳ vọng:

- Không có `reject(new Error(... timed out))`.
- Nếu còn text `timed out`, nó chỉ nằm trong warning/message không throw.

---

### Bước 4: Sửa dashboard home client load

File:

- `dashboard/app/(main)/dash/home/page.tsx`

Yêu cầu:

- Không dùng `console.error("Error loading home metrics:", err)` cho data load offline.
- Không để một promise fail làm fail toàn bộ dashboard.
- Dữ liệu fallback vẫn render empty state.
- Sidebar vẫn click được trong lúc data đang load/fail.

Audit:

```powershell
rg -n "Error loading home metrics|console\.error|Promise\.all\(" dashboard\app\(main\)\dash\home\page.tsx
```

Nếu file path có dấu ngoặc làm PowerShell lỗi, dùng quote:

```powershell
rg -n "Error loading home metrics|console\.error|Promise\.all\(" "dashboard\app\(main\)\dash\home\page.tsx"
```

---

### Bước 5: Sửa middleware auth offline behavior

File:

- `dashboard/lib/supabase/middleware.ts`

Yêu cầu:

- Không gọi `getUser()` khi không có auth cookie.
- Nhận được cả cookie chunked `sb-...-auth-token.0`, `sb-...-auth-token.1`.
- `getUser()` có timeout fallback user null.
- Offline không throw `AuthRetryableFetchError`.

Audit:

```powershell
rg -n "getUser|auth-token|AuthRetryableFetchError|console\.error|console\.warn" dashboard\lib\supabase\middleware.ts dashboard\proxy.ts
```

---

### Bước 6: Rà các page load Supabase khác

Chạy:

```powershell
rg -n "console\.error|Error loading|Failed to fetch|from \"@/lib/actions|from '@/lib/actions" dashboard\app
```

Phân loại:

- Page đọc dữ liệu để render: lỗi offline phải fallback empty state, không overlay.
- Mutation do user bấm nút: được show toast/error message, nhưng không crash page.
- Auth login/signup: lỗi đăng nhập được báo trong form; không cần fallback im lặng.

Không nhất thiết sửa toàn bộ trong một lượt nếu scope quá lớn, nhưng tối thiểu phải sửa các page làm sidebar không điều hướng được:

- `/dash/home`
- `/dash/creative/search`
- `/dash/tasks`
- `/dash/accounts`
- `/dash/data/posts`
- `/dash/settings`

---

## 6. Acceptance criteria

### Khi Supabase local/Docker đang tắt

Các URL sau phải load được, không overlay đỏ:

- `http://localhost:3000/`
- `http://localhost:3000/dash/home`
- `http://localhost:3000/dash/creative/search`
- `http://localhost:3000/dash/tasks`
- `http://localhost:3000/dash/accounts`
- `http://localhost:3000/dash/data/posts`
- `http://localhost:3000/dash/settings`
- `http://localhost:3000/login`

Sidebar click test:

- Click `Tìm Creative` → URL đổi sang `/dash/creative/search` trong dưới 2 giây.
- Click `Nhiệm vụ cào` → URL đổi sang `/dash/tasks` trong dưới 2 giây.
- Click `Tài khoản cào` → URL đổi sang `/dash/accounts` trong dưới 2 giây.
- Click `Bài viết & Video` → URL đổi sang `/dash/data/posts` trong dưới 2 giây.
- Click `Cài đặt hệ thống` → URL đổi sang `/dash/settings` trong dưới 2 giây.

Console:

- Không còn app error `getPostsPerDay timed out`.
- Không còn Next overlay `{ message, details, hint, code }` do Supabase offline.
- Không còn `AuthRetryableFetchError` throw ra từ app/middleware.
- Có thể có tối đa vài warning dạng `[SupabaseOffline] ... returning fallback`.
- Bỏ qua lỗi `chrome-extension://...` nếu test chưa tắt extension.

### Khi Supabase local/Docker đang bật

Các URL trên vẫn load bình thường.

Dữ liệu thật phải hiện nếu DB có data:

- dashboard metrics
- platform distribution
- posts per day
- creative search
- crawler tasks

Không được vì fallback offline mà luôn trả empty khi Supabase đang chạy.

---

## 7. Commands kiểm tra bắt buộc

Chạy trong `D:\Python\SinoMedia\dashboard`:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Sau đó chạy browser smoke test thủ công hoặc Playwright.

Manual:

```txt
1. Tắt Supabase/Docker.
2. npm.cmd run dev.
3. Mở Chrome Incognito/extensions off.
4. Vào http://localhost:3000/.
5. Click từng menu sidebar quan trọng.
6. Xác nhận không overlay đỏ.
7. Bật Supabase local.
8. Reload các trang và xác nhận data thật vẫn load.
```

Audit text:

```powershell
rg -n "getPostsPerDay timed out|reject\(new Error|AuthRetryableFetchError|Error loading home metrics" dashboard
rg -n "console\.error" dashboard\app dashboard\lib
```

GitNexus sau sửa:

```txt
detect_changes({ repo: "SinoMedia", scope: "all" })
```

Kỳ vọng:

- affected scope đúng vào dashboard service/middleware/page.
- risk không vượt quá MEDIUM.
- Nếu HIGH/CRITICAL, phải báo lại người dùng, không tự merge/commit.

---

## 8. Những điều không được làm

- Không yêu cầu Supabase/Docker phải chạy thì frontend mới điều hướng được.
- Không giấu mọi lỗi bằng `catch {}` rỗng.
- Không nuốt lỗi Next `DYNAMIC_SERVER_USAGE`.
- Không biến tất cả `console.error` thành `console.warn` một cách máy móc; mutation/auth error vẫn cần báo đúng nơi.
- Không import Node-only API vào file có thể chạy client.
- Không thêm polling vô hạn gọi Supabase liên tục khi Supabase offline.
- Không commit nếu người dùng chưa yêu cầu.
- Không chase lỗi `chrome-extension://...` như lỗi app nếu test chưa tắt extension.

---

## 9. Bàn giao sau khi fix

AI sửa code cần trả lời người dùng bằng checklist ngắn:

```txt
Đã fix:
- [ ] Timeout Supabase offline không còn throw Error("... timed out")
- [ ] Home dashboard dùng fallback, không overlay
- [ ] Middleware auth không gọi Supabase khi không có cookie
- [ ] Cookie chunked auth-token được nhận đúng
- [ ] Sidebar navigation pass khi Supabase off
- [ ] tsc/lint/build pass
- [ ] detect_changes GitNexus đã chạy

Kết quả test:
- Supabase OFF: ...
- Supabase ON: ...
- Console còn lỗi extension không thuộc app: có/không
```

Nếu còn lỗi, phải ghi rõ:

- route nào lỗi
- stack có frame thuộc app hay extension
- Supabase đang on/off
- command nào fail

