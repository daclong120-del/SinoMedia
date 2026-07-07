import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Route bảo mật (Yêu cầu đăng nhập)
  const isDashboardRoute = path.startsWith("/dash");
  // Route quản lý thành viên (Yêu cầu admin)
  const isMembersRoute = path.startsWith("/dash/manage-account/members");
  // Route xác thực (Chỉ cho phép khi chưa đăng nhập)
  const isAuthRoute = path === "/login" || path === "/sign-up" || path === "/forgot-password";

  if (isDashboardRoute) {
    if (!user) {
      // Lưu lại URL hiện tại để chuyển hướng sau khi đăng nhập thành công
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect_uri", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(redirectUrl);
    }

    if (isMembersRoute) {
      let isAdmin = false;
      const mockSession = request.cookies.get("sb-mock-session")?.value;
      if (mockSession === "true") {
        const mockUserEmail = request.cookies.get("sb-mock-user")?.value || "admin@sinomedia.vn";
        isAdmin = mockUserEmail === "admin@sinomedia.vn";
      } else if (supabase) {
        const { data: member } = await supabase
          .from("team_members")
          .select("role_id")
          .eq("user_id", user.id)
          .single();
        isAdmin = member?.role_id === "admin";
      }

      if (!isAdmin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/dash/home";
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
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
