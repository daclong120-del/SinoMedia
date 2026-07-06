import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Khởi tạo Supabase Client chạy ở môi trường Server (Server Components, Route Handlers, Server Actions)
 * Đọc/ghi session trực tiếp thông qua Next.js cookies store.
 */
export async function createClientServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Có thể bỏ qua lỗi này nếu hàm setAll được gọi bên trong một Server Component.
            // Middleware sẽ chịu trách nhiệm chính trong việc cập nhật cookie.
          }
        },
      },
    }
  );
}
