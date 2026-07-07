"use server";

/**
 * Server Actions — Authentication
 * Làm cầu nối gọi từ Client Components lên Auth Service.
 */
import { cookies } from "next/headers";
import { AuthService } from "@/lib/services/auth.service";
import { createClientServer } from "@/lib/supabase/server";

export async function loginAction(email: string, password: string) {
  try {
    const result = await AuthService.login(email, password);

    if (result.mock) {
      const cookieStore = await cookies();
      cookieStore.set("sb-mock-session", "true", { path: "/", maxAge: 86400, sameSite: "lax" });
      cookieStore.set("sb-mock-user", encodeURIComponent(result.email || ""), { path: "/", maxAge: 86400, sameSite: "lax" });
      return { success: true, mock: true, email: result.email || "" };
    }

    return { success: true, mock: false, user: result.user };
  } catch (err) {
    return { success: false, error: (err as Error).message || "Đăng nhập thất bại." };
  }
}

export async function signUpAction(email: string, password: string) {
  try {
    const result = await AuthService.signUp(email, password);
    return { success: true, user: result.user, hasSession: !!result.session };
  } catch (err) {
    return { success: false, error: (err as Error).message || "Đăng ký thất bại." };
  }
}

export async function signOutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("sb-mock-session");
    cookieStore.delete("sb-mock-user");

    const supabase = await createClientServer();
    await supabase.auth.signOut();
  } catch {
    // 
  }
}
