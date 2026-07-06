import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh session và đồng bộ cookies trong Next.js Middleware
 * Trả về response chứa cookie mới và thông tin user hiện tại (nếu có).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // Cập nhật cookies trên request headers
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          
          // Tạo response mới chứa request headers đã cập nhật
          supabaseResponse = NextResponse.next({
            request,
          });
          
          // Đặt cookies mới trên response để trình duyệt lưu lại
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Kiểm tra chế độ Mock Session để hỗ trợ phát triển offline
  const mockSession = request.cookies.get("sb-mock-session")?.value;
  if (mockSession === "true") {
    const mockUserEmail = request.cookies.get("sb-mock-user")?.value || "admin@sinomedia.vn";
    const user = {
      id: "mock-user-id-9999",
      email: mockUserEmail,
      user_metadata: {},
      app_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString()
    };
    return { supabaseResponse, user: user as any };
  }

  let user = null;
  try {
    // Gọi getUser() để tự động refresh token nếu hết hạn
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err) {
    console.warn("[Middleware] Supabase getUser failed, possibly offline:", err);
  }

  return { supabaseResponse, user };
}
