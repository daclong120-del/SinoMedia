/**
 * # Client HTTP cho Zhihu để gửi request và xử lý session
 */

import { CONFIG } from "../../config.js";
import { ProxyAgent } from "undici";
import { getZhihuSign } from "../../sign/zhihu_sign.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { IApiClient, RequestOptions, CookieData } from "../../base/base_client.js";

export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
let activeUserAgent = DEFAULT_USER_AGENT;

let dispatcher: ProxyAgent | undefined;
if (CONFIG.proxy) {
  dispatcher = new ProxyAgent(CONFIG.proxy);
}

let impitInstance: any = null;
const useImpit = process.env.DISABLE_IMPIT !== "true" && process.platform !== "win32";

/**
 * # Lấy instance impit để spoof JA3 và TLS
 */
async function getImpitInstance() {
  if (!useImpit) {
    return null;
  }
  if (impitInstance) {
    return impitInstance;
  }
  try {
    const { Impit } = await import("impit");
    impitInstance = new Impit({
      browser: "chrome",
      proxyUrl: CONFIG.proxy || undefined,
    });
    return impitInstance;
  } catch (err) {
    console.log("Không thể khởi tạo impit:", err);
    return null;
  }
}

/**
 * # Đọc cookie Zhihu từ môi trường hoặc tệp session
 */
export async function loadZhihuCookie(): Promise<string> {
  if (process.env.ZHIHU_COOKIE) {
    return process.env.ZHIHU_COOKIE;
  }
  try {
    const sessionPath = join(process.cwd(), "output", "zhihu_session.json");
    const content = await readFile(sessionPath, "utf8");
    const data = JSON.parse(content);
    return data.cookie || "";
  } catch {
    return "";
  }
}

/**
 * # Lưu cookie Zhihu vào tệp session
 */
export async function saveZhihuCookie(cookie: string): Promise<void> {
  const sessionPath = join(process.cwd(), "output", "zhihu_session.json");
  await mkdir(join(process.cwd(), "output"), { recursive: true });
  await writeFile(sessionPath, JSON.stringify({ cookie, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}

/**
 * # Lấy tương đối URI từ một URL đầy đủ
 */
function getRelativeUri(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  }
  return url;
}

/**
 * # Tải xuống file media (hình ảnh) và trả về Buffer
 */
export async function downloadMedia(url: string): Promise<Buffer> {
  const inst = await getImpitInstance();
  if (inst) {
    const response = await inst.fetch(url, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`Không thể tải media qua impit từ ${url}, mã HTTP: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    const response = await fetch(url, {
      method: "GET",
      // @ts-ignore
      dispatcher
    });
    if (!response.ok) {
      throw new Error(`Không thể tải media từ ${url}, mã HTTP: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

let browserContext: any = null;
let browserPage: any = null;

/**
 * # Lấy trang browser từ CloakBrowser dùng để gửi request thay thế trên Windows
 */
async function getBrowserPage() {
  if (browserPage) {
    return browserPage;
  }
  const { launchPersistentContext } = await import("cloakbrowser");
  const { join } = await import("node:path");
  const profileDir = join(process.cwd(), "output", "profiles", "zhihu");
  const launchOptions: any = {
    userDataDir: profileDir,
    headless: CONFIG.headless,
    geoip: true,
    humanize: true,
  };
  if (CONFIG.proxy) {
    launchOptions.proxy = CONFIG.proxy;
  }
  browserContext = await launchPersistentContext(launchOptions);
  try {
    const cookieStr = await loadZhihuCookie();
    if (cookieStr) {
      const cookieDict: Record<string, string> = {};
      for (const pair of cookieStr.split(";")) {
        const trimmed = pair.trim();
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex > 0) {
          const name = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          if (name) {
            cookieDict[name] = value;
          }
        }
      }
      const cookieObjects = Object.entries(cookieDict).map(([name, value]) => ({
        name,
        value,
        domain: ".zhihu.com",
        path: "/",
      }));
      await browserContext.addCookies(cookieObjects);
    }
  } catch (err) {
    console.log("Failed to load cookies:", err);
  }

  const pages = browserContext.pages();
  browserPage = pages[0] || (await browserContext.newPage());
  await browserPage.route("**/*", (route: any) => {
    const type = route.request().resourceType();
    if (["image", "media", "font", "stylesheet"].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  activeUserAgent = await browserPage.evaluate(() => navigator.userAgent);
  await browserPage.goto("https://www.zhihu.com", {
    waitUntil: "load",
    timeout: 60000,
  }).catch(() => { });

  const actualCookies = await browserContext.cookies();
  const actualCookieStr = actualCookies.map((c: any) => `${c.name}=${c.value}`).join("; ");
  await saveZhihuCookie(actualCookieStr);

  return browserPage;
}

/**
 * # Đóng CloakBrowser dọn dẹp tài nguyên khi kết thúc cào
 */
export async function closeBrowser(): Promise<void> {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
    browserPage = null;
  }
}

export class ZhihuClient implements IApiClient {
  private cookies: CookieData[] = [];
  private headers: Record<string, string> = {};

  constructor(options?: { proxy?: string; headers?: Record<string, string> }) {
    this.headers = {
      ...options?.headers,
    };
  }

  /**
   * # Thực hiện gửi yêu cầu HTTP thô đến Zhihu
   */
  async request(method: string, url: string, options?: RequestOptions): Promise<any> {
    const cookieStr = await loadZhihuCookie();
    if (cookieStr && !cookieStr.includes("d_c0")) {
      console.log("Cảnh báo: Không tìm thấy d_c0 trong cookie Zhihu. Chữ ký x-zse-96 có thể không hợp lệ.");
    }

    const headers: Record<string, string> = {
      "User-Agent": activeUserAgent,
      "Accept": "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Referer": options?.referer || "https://www.zhihu.com/",
      "Cookie": cookieStr,
      "x-api-version": "3.0.91",
      "x-app-za": "OS=Web",
      "x-requested-with": "fetch",
      "x-zse-93": "101_3_3.0",
      ...this.headers,
      ...options?.headers,
    };

    const finalUrl = url.startsWith("http") ? url : `https://www.zhihu.com${url}`;

    if (options?.sign !== false) {
      const relativeUri = getRelativeUri(finalUrl);
      const signRes = getZhihuSign(relativeUri, cookieStr);
      headers["x-zst-81"] = signRes["x-zst-81"];
      headers["x-zse-96"] = signRes["x-zse-96"];
    }

    const fetchOptions: any = {
      method: method || "GET",
      headers,
    };

    if (options?.body) {
      fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    let responseText = "";
    const inst = await getImpitInstance();

    if (inst) {
      try {
        const response = await inst.fetch(finalUrl, fetchOptions);
        responseText = await response.text();
      } catch (err) {
        console.log("Lỗi impit:", err);
      }
    }

    if (!responseText) {
      if (!useImpit) {
        try {
          const page = await getBrowserPage();
          if (options?.headers?.["Accept"]?.includes("text/html")) {
            await page.goto(finalUrl, {
              waitUntil: "load",
              timeout: 30000,
            }).catch(() => { });
            await new Promise(r => setTimeout(r, 2000));
            responseText = await page.content();
          } else {
            const evalResult: any = await page.evaluate(
              async ({ fetchUrl, method, headers, body }: { fetchUrl: string; method: string; headers: any; body: any }) => {
                try {
                  const cleanHeaders: any = {};
                  for (const [k, v] of Object.entries(headers || {})) {
                    const lower = k.toLowerCase();
                    if (lower !== "cookie" && lower !== "user-agent" && lower !== "host") {
                      cleanHeaders[k] = v;
                    }
                  }
                  const fetchOpts: any = {
                    method,
                    headers: cleanHeaders,
                    credentials: "include"
                  };
                  if (body) {
                    fetchOpts.body = body;
                  }
                  const res = await fetch(fetchUrl, fetchOpts);
                  const text = await res.text();
                  return {
                    status: res.status,
                    statusText: res.statusText,
                    headers: Array.from(res.headers.entries()),
                    text: text,
                  };
                } catch (err: any) {
                  return {
                    error: err.message,
                    stack: err.stack,
                  };
                }
              },
              {
                fetchUrl: finalUrl,
                method: fetchOptions.method,
                headers: fetchOptions.headers,
                body: fetchOptions.body,
              }
            );
            if (evalResult.error) {
              responseText = "";
            } else {
              responseText = evalResult.text || "";
            }
          }
        } catch (err) {
          console.log("Lỗi trình duyệt:", (err as Error).message);
        }
      }
    }

    if (!responseText) {
      try {
        const nativeOpts: any = {
          method: fetchOptions.method,
          headers: fetchOptions.headers,
        };
        if (fetchOptions.body) {
          nativeOpts.body = fetchOptions.body;
        }
        if (dispatcher) {
          nativeOpts.dispatcher = dispatcher;
        }
        const res = await fetch(finalUrl, nativeOpts);
        console.log("HTTP status:", res.status, "for URL:", finalUrl);
        responseText = await res.text();
        if (res.status !== 200) {
          console.log("Response headers:", JSON.stringify(Object.fromEntries(res.headers.entries())));
          console.log("Response body preview:", responseText.substring(0, 500));
        }
      } catch (err) {
        throw new Error(`Yêu cầu HTTP thất bại: ${(err as Error).message}`);
      }
    }

    if (options?.headers?.["Accept"]?.includes("text/html") || !responseText.trim().startsWith("{")) {
      return responseText;
    }

    try {
      const data = JSON.parse(responseText);
      if (data.error) {
        throw new Error(`API Zhihu báo lỗi: ${data.error.message || JSON.stringify(data.error)}`);
      }
      return data;
    } catch (err) {
      throw new Error(`Lỗi parse JSON hoặc lỗi API: ${(err as Error).message}. Nội dung phản hồi: ${responseText.substring(0, 300)}`);
    }
  }

  setPage(page: any, context?: any): void {
    browserPage = page;
    if (context) {
      browserContext = context;
    }
  }

  async getCurrentUserInfo(): Promise<any> {
    return this.request("GET", "/api/v4/me?include=email,is_active,is_bind_phone");
  }

  async pong(): Promise<boolean> {
    console.log("[ZhihuClient.pong] Bắt đầu pong zhihu...");
    try {
      const res = await this.getCurrentUserInfo();
      if (res && (res.uid || res.id) && res.name) {
        console.log("[ZhihuClient.pong] Ping zhihu thành công:", res.name);
        return true;
      }
      console.log("[ZhihuClient.pong] Ping zhihu thất bại, dữ liệu nhận được:", JSON.stringify(res));
      return false;
    } catch (err) {
      console.log("[ZhihuClient.pong] Lỗi khi ping zhihu:", (err as Error).message);
      return false;
    }
  }

  /**
   * # Cập nhật danh sách cookie cho client
   */
  async updateCookies(cookies: CookieData[]): Promise<void> {
    this.cookies = cookies;
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    await saveZhihuCookie(cookieStr);
  }

  /**
   * # Lấy danh sách cookie hiện tại của client
   */
  getActiveCookies(): CookieData[] {
    return this.cookies;
  }
}
