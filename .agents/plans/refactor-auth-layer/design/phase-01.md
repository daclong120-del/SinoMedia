# Design Phase 1: Foundation (Auth Service + Actions)

Tách biệt logic Authentication khỏi client component, xây dựng cấu trúc chuẩn:
`Client Form (UI) -> Server Action (Auth Action) -> Service Layer (Auth Service) -> Supabase Server API`

## 1. Auth Service: `lib/services/auth.service.ts`

Chứa logic nghiệp vụ liên quan đến xác thực, bao gồm cả chế độ kiểm tra online/offline và tài khoản demo bypass.

```typescript
import { createClientServer } from "@/lib/supabase/server";

export class AuthService {
  /**
   * Đăng nhập tài khoản
   */
  static async login(email: string, password: string) {
    // 1. Kiểm tra endpoint online/offline
    let isSupabaseOnline = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL!, {
        method: "GET",
        signal: controller.signal,
        mode: "no-cors",
      });
      clearTimeout(timeoutId);
      isSupabaseOnline = true;
    } catch (e) {
      // offline
    }

    // 2. Chế độ Bypass Demo (nếu offline hoặc là tài khoản demo)
    if (!isSupabaseOnline || (email === "admin@sinomedia.vn" && password === "12345678")) {
      return { mock: true, email };
    }

    // 3. Supabase Auth thật
    const supabase = await createClientServer();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { mock: false, user: data.user, session: data.session };
  }

  /**
   * Đăng ký tài khoản
   */
  static async signUp(email: string, password: string) {
    const supabase = await createClientServer();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  }
}
```

## 2. Auth Actions: `lib/actions/auth.actions.ts`

Làm cầu nối giữa Client component và Service, thiết lập cookies xác thực trực tiếp từ Server-side.

```typescript
"use server";

import { cookies } from "next/headers";
import { AuthService } from "@/lib/services/auth.service";

export async function loginAction(email: string, password: string) {
  try {
    const result = await AuthService.login(email, password);

    if (result.mock) {
      const cookieStore = await cookies();
      cookieStore.set("sb-mock-session", "true", { path: "/", maxAge: 86400, sameSite: "lax" });
      cookieStore.set("sb-mock-user", encodeURIComponent(result.email), { path: "/", maxAge: 86400, sameSite: "lax" });
      return { success: true, mock: true, email: result.email };
    }

    return { success: true, mock: false, user: result.user };
  } catch (err: any) {
    return { success: false, error: err.message || "Đăng nhập thất bại." };
  }
}

export async function signUpAction(email: string, password: string) {
  try {
    const result = await AuthService.signUp(email, password);
    return { success: true, user: result.user, hasSession: !!result.session };
  } catch (err: any) {
    return { success: false, error: err.message || "Đăng ký thất bại." };
  }
}
```
