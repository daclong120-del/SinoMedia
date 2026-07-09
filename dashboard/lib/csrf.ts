import { headers } from "next/headers";

/**
 * Xác thực Origin/Referer headers để phòng chống tấn công CSRF (Cross-Site Request Forgery)
 * khi cấu hình SameSite=Lax cho Auth Cookie.
 * Chỉ áp dụng cho các Next.js Route Handlers nhận mutation request (POST, PUT, DELETE, PATCH).
 * 
 * @returns {Promise<boolean>} true nếu request hợp lệ, false nếu có dấu hiệu tấn công CSRF
 */
export async function verifyCSRF(): Promise<boolean> {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const referer = headersList.get("referer");
  const host = headersList.get("host") || headersList.get("x-forwarded-host");
  const isProd = process.env.NODE_ENV === "production";

  // Whitelist tĩnh từ biến môi trường và dev local
  const allowedOrigins = new Set<string>([
    process.env.NEXT_PUBLIC_SITE_URL,
    "http://localhost:3000",
  ].filter(Boolean) as string[]);

  // Chỉ tin cậy dynamic host từ headers ở môi trường Development để phòng tránh Host Header Spoofing ở Production
  if (!isProd && host) {
    allowedOrigins.add(`http://${host}`);
    allowedOrigins.add(`https://${host}`);
  }

  // 1. Kiểm tra Origin header (được trình duyệt kiểm soát chặt chẽ)
  if (origin) {
    return allowedOrigins.has(origin);
  }

  // 2. Fallback kiểm tra Referer header (nếu thiếu Origin)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.has(refererUrl.origin);
    } catch {
      return false; // URL Referer không hợp lệ
    }
  }

  // 3. Thiếu cả hai đối với mutation -> Chặn để an toàn
  return false;
}
