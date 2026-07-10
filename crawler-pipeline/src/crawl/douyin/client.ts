import { CONFIG } from "../../config.js";
import { loadSession, SessionData } from "../../sign/session_store.js";
import { signDetail } from "../../sign/douyin_sign.js";
import { ProxyAgent } from "undici";

let tempSessionOverride: SessionData | null = null;

/**
 * # Đặt cấu hình phiên Douyin tạm thời từ database
 */
export function setDouyinSession(cookies: any[] | null, msToken: string = ""): void {
  if (cookies === null) {
    tempSessionOverride = null;
  } else {
    tempSessionOverride = {
      cookies,
      msToken,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * # Lấy thông tin phiên hoạt động hiệu dụng
 */
export async function getEffectiveSession(): Promise<SessionData | null> {
  if (tempSessionOverride) {
    return tempSessionOverride;
  }
  return loadSession();
}


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

// browserContext, browserPage, getBrowserPage and closeBrowser removed

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
  const session = await getEffectiveSession();
  if (!session) {
    throw new Error("Không tìm thấy session. Vui lòng chạy pipeline:session trước.");
  }

  // DOM details extraction removed

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
    try {
      console.log("Running native fetch fallback...");
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
      const res = await fetch(url, nativeOpts);
      responseText = await res.text();
      console.log(`Native HTTP status: ${res.status} for URL: ${url}`);
    } catch (err) {
      console.log(`Native fetch error: ${(err as Error).message}`);
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
  // No browser pre-initialization

  const session = await getEffectiveSession();
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

/**
 * # Kiểm tra xem phiên đăng nhập Douyin hiện tại còn hoạt động không
 */
export async function checkSessionAlive(): Promise<boolean> {
  try {
    const res = await douyinGet("/aweme/v1/web/user/profile/self/", {}, { sign: true });
    if (res && res.user && res.user.nickname) {
      console.log(`Kiểm tra phiên đăng nhập thành công cho: ${res.user.nickname}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Kiểm tra phiên thất bại:", (err as Error).message);
    return false;
  }
}

