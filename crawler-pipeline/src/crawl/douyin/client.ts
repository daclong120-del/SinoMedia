import { CONFIG } from "../../config.js";
import { loadSession } from "../../sign/session_store.js";
import { signDetail } from "../../sign/douyin_sign.js";
import { ProxyAgent } from "undici";

export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
let activeUserAgent = DEFAULT_USER_AGENT;

/**
 * # Lấy User-Agent hiện tại đang hoạt động
 */
export function getActiveUserAgent(): string {
  return activeUserAgent;
}

/**
 * # Sinh các Client Hints động dựa trên User-Agent hiện tại
 */
export function getClientHintsHeaders(): Record<string, string> {
  const ua = getActiveUserAgent();
  const isWin = ua.includes("Windows");
  const isMac = ua.includes("Macintosh");
  const isLinux = ua.includes("Linux") && !ua.includes("Android");
  const isMobile = ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone");
  const chromeVersionMatch = ua.match(/Chrome\/([\d.]+)/);
  const chromeMajor = chromeVersionMatch ? chromeVersionMatch[1].split(".")[0] : "120";
  let platform = '"Windows"';
  if (isMac) {
    platform = '"macOS"';
  } else if (isLinux) {
    platform = '"Linux"';
  } else if (isMobile) {
    platform = ua.includes("iPhone") ? '"iOS"' : '"Android"';
  }
  return {
    "sec-ch-ua": `"Not_A Brand";v="8", "Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}"`,
    "sec-ch-ua-mobile": isMobile ? "?1" : "?0",
    "sec-ch-ua-platform": platform,
  };
}

let pageLoadCount = 0;

/**
 * # Tăng số lượng trang đã tải và thực hiện tái khởi động trình duyệt nếu vượt ngưỡng
 */
export async function incrementPageLoad(): Promise<void> {
  pageLoadCount++;
  if (pageLoadCount >= 50) {
    console.log(`[Recycle] pageLoadCount: ${pageLoadCount}, closing browser...`);
    await closeBrowser();
    pageLoadCount = 0;
  }
}

let dispatcher: ProxyAgent | undefined;
if (CONFIG.proxy) {
  dispatcher = new ProxyAgent(CONFIG.proxy);
}

let impitInstance: any = null;
const useImpit = process.env.DISABLE_IMPIT !== "true" && process.platform !== "win32";

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
    console.log("Failed to initialize impit:", err);
    return null;
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
  const profileDir = join(process.cwd(), "output", "profiles", "douyin");
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
    const session = await loadSession();
    if (session && session.cookies) {
      const validCookies = session.cookies.filter((c: any) => c.name && c.name.trim() !== "");
      await browserContext.addCookies(validCookies);
      console.log(`Loaded ${validCookies.length} cookies into browser context.`);
    }
  } catch (err) {
    console.log("Failed to load cookies into browser context:", err);
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
  browserPage.on("console", (msg: any) => console.log("PAGE LOG:", msg.text()));
  browserPage.on("pageerror", (err: any) => console.log("PAGE ERROR:", err.message));
  activeUserAgent = await browserPage.evaluate(() => navigator.userAgent);
  console.log("Active User-Agent updated:", activeUserAgent);

  await browserPage.goto("https://www.douyin.com", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  let hasTtwid = false;
  for (let i = 0; i < 10; i++) {
    const cookies = await browserContext.cookies();
    if (cookies.some((c: any) => c.name === "ttwid")) {
      hasTtwid = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!hasTtwid) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const actualCookies = await browserContext.cookies();
  const actualMsToken = await browserPage.evaluate(() => {
    try {
      return localStorage.getItem("msToken") || localStorage.getItem("xmst") || "";
    } catch {
      return "";
    }
  });

  const { saveSession } = await import("../../sign/session_store.js");
  await saveSession({ cookies: actualCookies, msToken: actualMsToken });

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

  if (url.includes("/aweme/v1/web/aweme/detail/")) {
    const urlObj = new URL(url);
    const awemeId = urlObj.searchParams.get("aweme_id");
    if (awemeId) {
      console.log(`Bắt đầu trích xuất chi tiết video ${awemeId} qua DOM...`);
      try {
        const page = await getBrowserPage();
        let interceptedDetail: any = null;
        
        const responseHandler = async (response: any) => {
          const resUrl = response.url();
          if (resUrl.includes("/aweme/v1/web/aweme/detail/")) {
            try {
              const text = await response.text();
              const json = JSON.parse(text);
              if (json && json.aweme_detail) {
                interceptedDetail = json.aweme_detail;
                console.log(`Đã chặn bắt thành công aweme_detail của video ${awemeId} từ gói tin mạng.`);
              }
            } catch (err) {
            }
          }
        };
        
        page.on("response", responseHandler);
        
        try {
          await page.goto(`https://www.douyin.com/video/${awemeId}`, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await page.waitForFunction(() => {
            const el = document.getElementById("RENDER_DATA");
            return el && el.textContent && el.textContent.trim().length > 0;
          }, { timeout: 10000 }).catch(() => {});
        } catch (err) {
          console.log(`Lỗi khi chuyển trang video ${awemeId}:`, (err as Error).message);
        } finally {
          page.off("response", responseHandler);
        }
        
        if (!interceptedDetail) {
          console.log("Không chặn bắt được từ API mạng, đang thử trích xuất từ RENDER_DATA...");
          const renderDataText = await page.evaluate(() => {
            const el = document.getElementById("RENDER_DATA");
            return el ? el.textContent : "";
          });
          if (renderDataText) {
            try {
              const decoded = decodeURIComponent(renderDataText);
              const renderDataObj = JSON.parse(decoded);
              
              const findAweme = (obj: any): any => {
                if (!obj || typeof obj !== "object") return null;
                if (Array.isArray(obj)) {
                  for (const item of obj) {
                    const res = findAweme(item);
                    if (res) return res;
                  }
                } else {
                  if (obj.aweme_id && (obj.video || obj.desc || obj.statistics)) {
                    return obj;
                  }
                  for (const key of Object.keys(obj)) {
                    const res = findAweme(obj[key]);
                    if (res) return res;
                  }
                }
                return null;
              };
              
              const found = findAweme(renderDataObj);
              if (found) {
                interceptedDetail = found;
                console.log(`Đã trích xuất thành công aweme_detail từ RENDER_DATA của video ${awemeId}.`);
              }
            } catch (err) {
              console.log("Lỗi khi giải mã RENDER_DATA:", err);
            }
          }
        }
        
        if (!interceptedDetail) {
          console.log("Đang thử trích xuất từ biến toàn cục...");
          const globalData = await page.evaluate(() => {
            try {
              return (window as any)._ROUTER_DATA || (window as any).__INITIAL_STATE__ || null;
            } catch {
              return null;
            }
          });
          if (globalData) {
            const findAweme = (obj: any): any => {
              if (!obj || typeof obj !== "object") return null;
              if (Array.isArray(obj)) {
                for (const item of obj) {
                  const res = findAweme(item);
                  if (res) return res;
                }
              } else {
                if (obj.aweme_id && (obj.video || obj.desc || obj.statistics)) {
                  return obj;
                }
                for (const key of Object.keys(obj)) {
                  const res = findAweme(obj[key]);
                  if (res) return res;
                }
              }
              return null;
            };
            const found = findAweme(globalData);
            if (found) {
              interceptedDetail = found;
              console.log(`Đã trích xuất thành công aweme_detail từ biến toàn cục của video ${awemeId}.`);
            }
          }
        }
        
        if (interceptedDetail) {
          return { aweme_detail: interceptedDetail };
        }
      } catch (err) {
        console.log(`Lỗi trong quá trình trích xuất DOM của video ${awemeId}:`, err);
      } finally {
        await incrementPageLoad();
      }
    }
  }

  const cookieStr = session.cookies
    .filter((c: any) => c.name && c.name.trim() !== "")
    .map((c: any) => `${c.name}=${c.value}`)
    .join("; ");
  const headers = {
    "User-Agent": getActiveUserAgent(),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.douyin.com/",
    ...getClientHintsHeaders(),
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

  console.log("Fetching URL:", url);
  
  let responseText = "";
  const inst = await getImpitInstance();

  if (inst) {
    try {
      const response = await inst.fetch(url, fetchOptions);
      console.log("impit status:", response.status);
      responseText = await response.text();
      console.log("impit response length:", responseText.length);
    } catch (err) {
      console.log("impit failed:", err);
    }
  }

  if (!responseText) {
    if (!useImpit) {
      try {
        const page = await getBrowserPage();
        const { join } = await import("node:path");
        await page.screenshot({ path: join(process.cwd(), "output", "screenshot.png") });
        console.log("Screenshot saved to output/screenshot.png");
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
            fetchUrl: url,
            method: fetchOptions.method,
            headers: fetchOptions.headers,
            body: fetchOptions.body,
          }
        );
        console.log("Browser evaluate result:", JSON.stringify({
          status: evalResult.status,
          statusText: evalResult.statusText,
          error: evalResult.error,
          headers: evalResult.headers,
          textLength: evalResult.text ? evalResult.text.length : 0,
        }, null, 2));
        if (evalResult.error) {
          responseText = "";
        } else {
          responseText = evalResult.text || "";
        }
      } catch (err) {
        console.log("browser failed:", err);
      }
    }
  }

  if (!responseText) {
    throw new Error("Yêu cầu thất bại: Không nhận được phản hồi từ impit hoặc trình duyệt fallback.");
  }

  try {
    return JSON.parse(responseText);
  } catch (err) {
    throw new Error(`JSON parse error: ${(err as Error).message}. Response text: ${responseText.substring(0, 300)}`);
  }
}

/**
 * # Tải xuống file media từ URL và trả về Buffer
 */
export async function downloadMedia(url: string): Promise<Buffer> {
  const inst = await getImpitInstance();
  if (inst) {
    const response = await inst.fetch(url, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`Không thể tải media từ ${url}, HTTP ${response.status}`);
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
      throw new Error(`Không thể tải media từ ${url}, HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

/**
 * # Sinh webid ngẫu nhiên tương tự thuật toán của Douyin
 */
export function getWebId(): string {
  function e(t: number | null): string {
    if (t !== null) {
      return String(t ^ (Math.floor(16 * Math.random()) >> Math.floor(t / 4)));
    } else {
      return [String(1e7), String(1e3), String(4e3), String(8e3), String(1e11)].join("-");
    }
  }
  const base = e(null);
  let result = "";
  for (let i = 0; i < base.length; i++) {
    const char = base[i];
    if (char === '0' || char === '1' || char === '8') {
      result += e(parseInt(char, 10));
    } else {
      result += char;
    }
  }
  return result.replace(/-/g, "").substring(0, 19);
}

export function getCommonParams(webid: string, msToken: string): Record<string, string> {
  const ua = getActiveUserAgent();
  const isWin = ua.includes("Windows");
  const chromeVersionMatch = ua.match(/Chrome\/([\d.]+)/);
  const chromeVersion = chromeVersionMatch ? chromeVersionMatch[1] : "125.0.0.0";
  const chromeMajor = chromeVersion.split(".")[0];
  return {
    "device_platform": "webapp",
    "aid": "6383",
    "channel": "channel_pc_web",
    "version_code": "190600",
    "version_name": "19.6.0",
    "update_version_code": "170400",
    "pc_client_type": "1",
    "cookie_enabled": "true",
    "browser_language": "zh-CN",
    "browser_platform": isWin ? "Win32" : "MacIntel",
    "browser_name": "Chrome",
    "browser_version": chromeVersion,
    "browser_online": "true",
    "engine_name": "Blink",
    "os_name": isWin ? "Windows" : "Mac OS",
    "os_version": isWin ? "10" : "10.15.7",
    "cpu_core_num": "8",
    "device_memory": "8",
    "engine_version": `${chromeMajor}.0`,
    "platform": "PC",
    "screen_width": "2560",
    "screen_height": "1440",
    "effective_type": "4g",
    "round_trip_time": "50",
    "webid": webid,
    "msToken": msToken,
  };
}

/**
 * # Thực hiện gọi GET request đến Douyin API và tự động ký a_bogus
 */
export async function douyinGet(
  uri: string,
  extraParams: Record<string, string>,
  opts: { sign?: boolean; referer?: string } = {}
): Promise<any> {
  if (!useImpit) {
    try {
      await getBrowserPage();
    } catch (err) {
      console.log("Failed to pre-initialize browser page:", err);
    }
  }

  const session = await loadSession();
  if (!session) {
    throw new Error("Chưa có session, chạy bootstrap trước.");
  }

  const webid = getWebId();
  const params = { ...getCommonParams(webid, session.msToken), ...extraParams };
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const shouldSign = opts.sign !== false && !uri.includes("/v1/web/general/search");
  const finalUrl = shouldSign
    ? `https://www.douyin.com${uri}?${queryString}&a_bogus=${signDetail(queryString, getActiveUserAgent())}`
    : `https://www.douyin.com${uri}?${queryString}`;

  return douyinRequest(finalUrl, opts.referer ? { headers: { Referer: opts.referer } } : {});
}

/**
 * # Helper dừng luồng
 */
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const CRAWL_SLEEP_MS = 1500;
