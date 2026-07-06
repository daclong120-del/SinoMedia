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
        setAll(cookiesToSet) {
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

  // Gọi getUser() để tự động refresh token nếu hết hạn
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
