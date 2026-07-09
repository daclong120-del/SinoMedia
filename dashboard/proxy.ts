import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Route bảo mật (Yêu cầu đăng nhập)
  const isDashboardRoute = path.startsWith("/dash");
  // Route quản lý thành viên, tài khoản, tác vụ (Yêu cầu admin)
  const isAdminOnlyRoute = path.startsWith("/dash/manage-account/members") || 
                           path.startsWith("/dash/accounts") || 
                           path.startsWith("/dash/tasks");
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

    if (isAdminOnlyRoute) {
      let isAdmin = false;
      const mockSession = request.cookies.get("sb-mock-session")?.value;
      const isDevMockAllowed = process.env.NODE_ENV !== "production" && process.env.ENABLE_MOCK_AUTH === "true";
      
      if (mockSession === "true" && isDevMockAllowed) {
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

// Export thêm alias middleware để tương thích nếu cần
export { proxy as middleware };

// Chỉ chạy proxy trên các dashboard routes và auth pages
export const config = {
  matcher: [
    "/dash/:path*",
    "/login",
    "/sign-up",
    "/forgot-password",
  ],
};
