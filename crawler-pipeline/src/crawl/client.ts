import { CONFIG } from "../config.js";
import { loadSession } from "../sign/session_store.js";
import { Impit } from "impit";

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const impit = new Impit({
  browser: "chrome",
  proxyUrl: CONFIG.proxy || undefined,
});

/**
 * # Gửi HTTP request đến Douyin API sử dụng session cookie và msToken
 */
export async function douyinRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<any> {
  const session = await loadSession();
  if (!session) {
    throw new Error("Không tìm thấy session. Vui lòng chạy pipeline:session trước.");
  }

  const cookieStr = session.cookies.map((c: any) => `${c.name}=${c.value}`).join("; ");
  const headers = {
    "User-Agent": DEFAULT_USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.douyin.com/",
    "Cookie": cookieStr,
    ...options.headers,
  };

  const fetchOptions: any = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  const response = await impit.fetch(url, fetchOptions);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * # Tải xuống file media từ URL và trả về Buffer
 */
export async function downloadMedia(url: string): Promise<Buffer> {
  const response = await impit.fetch(url, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`Không thể tải media từ ${url}, HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

