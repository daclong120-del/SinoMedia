# 💾 Chiến Lược Lưu Trữ Dữ Liệu Phía Client (Client Storage Strategy)

Tài liệu này đặc tả chi tiết thiết kế lưu trữ dữ liệu phía client trong Dashboard của dự án **SinoMedia** nhằm tối ưu hóa bảo mật (chống XSS, CSRF), nâng cao hiệu năng (chống flicker, non-blocking UI) và đảm bảo tính tin cậy (schema versioning, Safari Private fallback).

---

## 🗺️ 1. Bản Đồ Phân Phối Dữ Liệu Client

| Phân Vùng Lưu Trữ | Dữ Liệu Áp Dụng | Cơ Chế Quản Lý | Rủi Ro & Cơ Chế Kiểm Soát |
|---|---|---|---|
| **Cookies** *(httpOnly, Secure, SameSite=Lax)* | `access_token`, `refresh_token` | `@supabase/ssr` (Server Component, Middleware) | **Auth & Session**. Bảo vệ chống XSS bằng cách ẩn token khỏi JavaScript. Phòng CSRF bằng Lax cookie kết hợp Origin check tại API Route. |
| **localStorage** | Theme mode, Sidebar state, Locale, Table layout (column visibility, paging count) | `Zustand` + `persist` | **UI Preferences** không nhạy cảm, cần lưu vĩnh viễn. Chống flicker bằng inline-script đọc sớm ở `<head>`. Có versioning/migration. |
| **sessionStorage** | Console debug logs, Active Workspace/Org (theo tab) | Zustand (in-memory) / Session API | **Tab-scoped data**. Đảm bảo trải nghiệm đa nhiệm (mở nhiều tab với nhiều workspace khác nhau). Tự động dọn dẹp khi đóng tab. |
| **IndexedDB** | Danh sách proxy nhập bulk, danh sách link KOL (hàng trăm/nghìn dòng) | `idb-keyval` + Debounce (~500ms) | **Dữ liệu lớn, có cấu trúc**. Lưu bất đồng bộ để tránh block main thread. Bắt exception và fallback memory trên Safari Private Browsing. |

---

## 🔐 2. Auth & Session Management (Cookies + `@supabase/ssr`)

Để giải quyết triệt để rủi ro đánh cắp JWT Token qua lỗ hổng XSS (do mã độc JavaScript đọc từ localStorage), toàn bộ token sẽ được quản lý ở Server-side thông qua Cookie có thuộc tính bảo mật nghiêm ngặt.

### A. Cấu Hình Cookie
```typescript
// Cấu hình cookie mặc định cho Supabase SSR Client
const cookieOptions = {
  name: 'sinomedia-auth',
  lifetime: 60 * 60 * 24 * 7, // 7 ngày
  domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
  path: '/',
  sameSite: 'lax', // Cho phép gửi cookie khi redirect từ Google OAuth
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true, // JavaScript hoàn toàn không thể tiếp cận token
};
```

### B. Luồng Làm Mới Phiên Đăng Nhập (Auth Token Refresh)
Middleware của Next.js chịu trách nhiệm kiểm tra và refresh token tự động mỗi khi trình duyệt gửi request:

```text
Browser -> HTTP Request (mang Cookie) -> Next.js Middleware -> Đọc Cookie & call Supabase Auth API
                                                                       |
      +----------------- Cập nhật Cookie mới (nếu gần hết hạn) <-------+
      v
Next.js Page/Route Handler (Server Component) -> Render UI hoặc trả về API Response
```

### C. Cơ Chế Chống CSRF (Cross-Site Request Forgery)
Do Cookie sử dụng `SameSite=Lax` để hỗ trợ OAuth Redirect, các Route Handler nhận request dạng Mutation (`POST`, `PUT`, `DELETE`, `PATCH`) có thể gặp rủi ro CSRF nếu bị lừa click link từ một bên thứ ba.
Để bảo vệ hệ thống, toàn bộ Route Handler dùng cho mutation bắt buộc phải kiểm tra headers `Origin` và `Referer`:

```typescript
// dashboard/app/api/auth-shield.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function verifyCSRF() {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const referer = headersList.get("referer");
  
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL, // e.g. https://dash.sinomedia.com
    "http://localhost:3000",
  ].filter(Boolean);

  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      return false;
    }
  } else if (referer) {
    const refererUrl = new URL(referer);
    if (!allowedOrigins.includes(refererUrl.origin)) {
      return false;
    }
  } else {
    // Từ chối nếu thiếu cả Origin và Referer đối với mutation request
    return false;
  }
  return true;
}
```

---

## 🎨 3. UI Preferences (Zustand Persist + Chống Flicker)

Trạng thái giao diện cần tồn tại qua các phiên làm việc và không được làm giật/nhấp nháy màn hình (flicker) khi load trang (đặc biệt là Dark Mode).

### A. Cấu Hình Zustand Persist Store với Schema Versioning
Để tránh crash app khi cập nhật schema store trong tương lai, luôn định nghĩa `version` và hàm `migrate`:

```typescript
// dashboard/lib/stores/use-ui-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UIState {
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  locale: string;
  tableLayouts: Record<string, { visibleColumns: string[]; pageSize: number }>;
  version: number;
}

const DEFAULT_STATE: Omit<UIState, "version"> = {
  theme: "system",
  sidebarCollapsed: false,
  locale: "vi",
  tableLayouts: {},
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      version: 1, // Schema version hiện tại
    }),
    {
      name: "sinomedia-ui-preferences", // Key trong localStorage
      storage: createJSONStorage(() => localStorage),
      version: 1, // Khai báo version của store
      migrate: (persistedState: any, version: number) => {
        console.log(`[Store] Migrating from version ${version} to 1`);
        
        if (version === 0) {
          // Ví dụ: migrate từ phiên bản cũ khi chưa có tableLayouts
          return {
            ...persistedState,
            tableLayouts: {},
          };
        }
        
        return persistedState as UIState;
      },
    }
  )
);
```

### B. Script Chống Flicker Dark Mode (Inline Script ở Head)
Zustand Persist lưu trữ dưới dạng một JSON String. Script inline trong `<head>` cần parse đúng key `sinomedia-ui-preferences` để trích xuất `theme` trước khi trình duyệt vẽ (paint) giao diện:

```typescript
// dashboard/app/layout.tsx (chèn trong <head>)
<Script
  id="theme-detector"
  strategy="beforeInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      try {
        const stored = localStorage.getItem('sinomedia-ui-preferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          const theme = parsed?.state?.theme;
          if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } else {
          // Fallback mặc định theo preferences hệ thống nếu chưa có store
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
          }
        }
      } catch (_) {}
    `,
  }}
/>
```

---

## 🕷️ 4. Xử Lý Nhập Liệu Dữ Liệu Lớn (IndexedDB + Safari Private Fallback)

Dữ liệu danh sách proxy hoặc link tài khoản cào số lượng lớn (có thể lên tới hàng nghìn dòng) không được lưu vào `localStorage` vì giới hạn dung lượng (~5MB) và cơ chế ghi đồng bộ sẽ khóa chặt Main Thread của trình duyệt.

### A. Wrapper Lưu Trữ Bất Đồng Bộ `idb-keyval` An Toàn
Chúng ta viết một wrapper an toàn để phòng tránh lỗi ghi đĩa và xử lý chế độ Private Browsing:

```typescript
// dashboard/lib/utils/storage-helper.ts
import { get, set, del } from "idb-keyval";

// Biến lưu trữ tạm trên RAM nếu IndexedDB bị chặn
const inMemoryCache = new Map<string, any>();
let isIndexedDBAvailable: boolean | null = null;

async function checkIndexedDBAvailability(): Promise<boolean> {
  if (isIndexedDBAvailable !== null) return isIndexedDBAvailable;
  try {
    // Thử thực hiện một lệnh ghi và đọc giả định
    await set("sinomedia-db-test", "ok");
    await get("sinomedia-db-test");
    await del("sinomedia-db-test");
    isIndexedDBAvailable = true;
  } catch (e) {
    console.warn("[Storage] IndexedDB is not available. Using in-memory fallback.", e);
    isIndexedDBAvailable = false;
  }
  return isIndexedDBAvailable;
}

export async function setLargeDraft(key: string, value: any): Promise<{ success: boolean; isFallback: boolean }> {
  const isAvailable = await checkIndexedDBAvailability();
  if (isAvailable) {
    try {
      await set(key, value);
      return { success: true, isFallback: false };
    } catch (err) {
      console.error("[Storage] IndexedDB write error:", err);
    }
  }
  
  // Fallback sang memory cache
  inMemoryCache.set(key, value);
  return { success: true, isFallback: true };
}

export async function getLargeDraft<T>(key: string): Promise<T | null> {
  const isAvailable = await checkIndexedDBAvailability();
  if (isAvailable) {
    try {
      return (await get(key)) as T || null;
    } catch (err) {
      console.error("[Storage] IndexedDB read error:", err);
    }
  }
  return (inMemoryCache.get(key) as T) || null;
}
```

### B. UX Fallback: Toast Cảnh Báo
Khi hàm `setLargeDraft` trả về `{ success: true, isFallback: true }`, UI component nhập liệu sẽ hiển thị một Toast cảnh báo nhẹ để người dùng không bị mất dữ liệu bất ngờ:

```typescript
const handleSave = async (data: string[]) => {
  const result = await setLargeDraft("proxy-bulk-input-draft", data);
  if (result.success && result.isFallback) {
    // Show Toast
    showToast({
      title: "Lưu ý chế độ ẩn danh",
      description: "Hệ thống đang lưu tạm bản nháp trên bộ nhớ. Bản nháp này sẽ biến mất khi bạn đóng tab trình duyệt.",
      type: "warning"
    });
  }
};
```

### C. Cơ Chế Debounce Ghi Để Bảo Vệ Hiệu Năng
Để tránh ghi đĩa liên tục mỗi khi user nhấn một phím (stroke-by-stroke), thao tác lưu draft phải được bọc qua cơ chế debounce khoảng `500ms`:

```typescript
import { debounce } from "@/lib/utils/debounce";

// Tạo phiên bản debounced của hàm lưu
const debouncedSave = debounce(async (data: string[]) => {
  await handleSave(data);
}, 500);

// Gọi debouncedSave(currentInput) tại hàm onChange của textarea
```

---

## 🗺️ 5. Trực Quan Hóa Luồng Hoạt Động (Data Flow)

Sơ đồ mô tả luồng truy cập và xác thực tài khoản an toàn:

```text
User Request -> Next.js Middleware -> Có Cookie Auth?
                     |
                     +---> [NO] -> Redirect sang /login
                     |
                     +---> [YES] -> Hợp lệ? -> Page Render -> Client load UI Prefs (Zustand localStorage)
                                       |
                                       v
                                [API Mutation] -> Client gửi request mang Cookie + Host Headers
                                                        |
                                                        v
                                                Next.js API Route -> Check Origin === Site_URL?
                                                                          |
                                                                          +---> [NO] -> 403 CSRF Alert!
                                                                          |
                                                                          +---> [YES] -> Execute (Supabase RLS)
```
