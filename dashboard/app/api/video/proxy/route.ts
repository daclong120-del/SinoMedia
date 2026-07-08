import { NextRequest } from "next/server";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Khởi tạo headers cho request tới video CDN
  const headers = new Headers();
  
  // Set User-Agent giả lập trình duyệt
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // Set Referer & Origin tương ứng với từng nền tảng để tránh lỗi 403 Forbidden
  const lowerUrl = targetUrl.toLowerCase();
  if (
    lowerUrl.includes("bilibili") ||
    lowerUrl.includes("hdslb") ||
    lowerUrl.includes("bilivideo")
  ) {
    headers.set("Referer", "https://www.bilibili.com/");
    headers.set("Origin", "https://www.bilibili.com");
  } else if (
    lowerUrl.includes("douyin") ||
    lowerUrl.includes("snssdk") ||
    lowerUrl.includes("amemv") ||
    lowerUrl.includes("iesdouyin")
  ) {
    headers.set("Referer", "https://www.douyin.com/");
    headers.set("Origin", "https://www.douyin.com");
  } else if (
    lowerUrl.includes("kuaishou") ||
    lowerUrl.includes("yximgs") ||
    lowerUrl.includes("gifshow")
  ) {
    headers.set("Referer", "https://www.kuaishou.com/");
    headers.set("Origin", "https://www.kuaishou.com");
  } else if (lowerUrl.includes("xiaohongshu") || lowerUrl.includes("xhscdn")) {
    headers.set("Referer", "https://www.xiaohongshu.com/");
    headers.set("Origin", "https://www.xiaohongshu.com");
  }

  // Chuyển tiếp header Range từ browser để hỗ trợ seeking/tua video
  const clientRange = req.headers.get("range");
  if (clientRange) {
    headers.set("Range", clientRange);
  }

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    // Nếu HTTP status không phải thành công hoặc 206 (Partial Content), trả lỗi
    if (!res.ok && res.status !== 206) {
      return new Response(`Failed to fetch media from target: ${res.statusText}`, {
        status: res.status,
      });
    }

    // Sao chép các headers liên quan của video stream
    const responseHeaders = new Headers();
    const headersToCopy = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
    ];

    for (const h of headersToCopy) {
      const val = res.headers.get(h);
      if (val) {
        responseHeaders.set(h, val);
      }
    }

    // Cấu hình CORS để browser cho phép đọc dữ liệu stream
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Range");

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[VideoProxy] Error streaming video:", error);
    const err = error as Error & { cause?: { message?: string; errors?: Array<{ code: string; message: string }> } | null | undefined };
    let causeMsg = err.cause ? (err.cause.message || String(err.cause)) : "No cause";
    if (err.cause && Array.isArray(err.cause.errors)) {
      causeMsg += " [ " + err.cause.errors.map(e => `${e.code || "unknown"}: ${e.message || "unknown"}`).join(", ") + " ]";
    }
    const isDev = process.env.NODE_ENV === "development";
    const body = isDev 
      ? `Internal Server Error: ${err.message}\nCause: ${causeMsg}\n${err.stack || "No stack"}`
      : "Internal Server Error";
    return new Response(body, { status: 500 });
  }
}

export async function OPTIONS() {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
  return new Response(null, { status: 204, headers });
}
