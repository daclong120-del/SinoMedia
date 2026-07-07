import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Route bảo mật (Yêu cầu đăng nhập)
  const isDashboardRoute = path.startsWith("/dash");
  // Route xác thực (Chỉ cho phép khi chưa đăng nhập)
  const isAuthRoute = path === "/login" || path === "/sign-up" || path === "/forgot-password";

  if (isDashboardRoute) {
    if (!user) {
      // Lưu lại URL hiện tại để chuyển hướng sau khi đăng nhập thành công
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect_uri", encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search));
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isAuthRoute) {
    if (user) {
      // Đã đăng nhập, không cho vào trang login nữa mà đẩy về dashboard
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dash/home";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

// Chỉ chạy proxy trên các dashboard routes và auth pages
export const config = {
  matcher: [
    "/dash/:path*",
    "/login",
    "/sign-up",
    "/forgot-password",
  ],
};
