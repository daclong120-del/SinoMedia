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

  // Danh sách các domain được phép gọi API (Origin whitelist)
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL, // Ví dụ: https://dash.sinomedia.com
    "http://localhost:3000",           // Cho môi trường dev local
  ].filter(Boolean) as string[];

  // 1. Kiểm tra Origin header (được trình duyệt tự động đính kèm và kiểm soát chặt chẽ)
  if (origin) {
    return allowedOrigins.includes(origin);
  }

  // 2. Fallback kiểm tra Referer header (nếu trình duyệt hoặc client không gửi Origin)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.includes(refererUrl.origin);
    } catch {
      return false; // URL Referer không hợp lệ
    }
  }

  // 3. Nếu thiếu cả Origin và Referer đối với mutation request -> Nghi ngờ và chặn
  return false;
}
