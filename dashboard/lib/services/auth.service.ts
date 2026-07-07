/**
 * Service — Authentication (Sign In, Sign Up)
 * Đóng gói logic nghiệp vụ xác thực và chế độ bypass demo local.
 */
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
    } catch {
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
