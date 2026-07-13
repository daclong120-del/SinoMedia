import { CONFIG } from "../../config.js";
import { ProxyAgent } from "undici";
import { signDetail } from "../../sign/douyin_sign.js";
import { SessionExpiredError, IPBlockError, DataFetchError } from "./exception.js";
import { DouyinSession } from "./session.js";

export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let dispatcher: ProxyAgent | undefined;
if (CONFIG.proxy) {
  dispatcher = new ProxyAgent(CONFIG.proxy);
}

let impitInstance: any = null;
const useImpit = process.env.DISABLE_IMPIT !== "true";

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

/**
 * # Redact nhạy cảm trong URL khi log
 */
export function redactUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const paramsToRedact = ["msToken", "verifyFp", "fp", "uifid", "a_bogus", "token", "xmst"];
    let changed = false;
    for (const param of paramsToRedact) {
      if (urlObj.searchParams.has(param)) {
        const val = urlObj.searchParams.get(param);
        if (val && val.length > 8) {
          urlObj.searchParams.set(param, `${val.substring(0, 4)}...${val.substring(val.length - 4)}`);
        } else {
          urlObj.searchParams.set(param, "***");
        }
        changed = true;
      }
    }
    return changed ? urlObj.toString() : url;
  } catch {
    return url;
  }
}

/**
 * # Sinh các Client Hints động dựa trên User-Agent
 */
export function getClientHintsHeaders(ua: string): Record<string, string> {
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

/**
 * # Xây dựng tham số query chung của Douyin
 */
export function buildCommonParams(session: DouyinSession): Record<string, string> {
  const params: Record<string, string> = {
    "device_platform": "webapp",
    "aid": "6383",
    "channel": "channel_pc_web",
    "version_code": "190600",
    "version_name": "19.6.0",
    "update_version_code": "170400",
    "pc_client_type": "1",
    "cookie_enabled": "true",
    "browser_language": session.browserLanguage,
    "browser_platform": session.browserPlatform,
    "browser_name": session.browserName,
    "browser_version": session.browserVersion,
    "browser_online": "true",
    "engine_name": "Blink",
    "os_name": session.browserPlatform === "Win32" ? "Windows" : "Mac OS",
    "os_version": session.browserPlatform === "Win32" ? "10" : "10.15.7",
    "cpu_core_num": "8",
    "device_memory": "8",
    "engine_version": `${session.browserVersion.split(".")[0]}.0`,
    "platform": "PC",
    "screen_width": String(session.screenWidth),
    "screen_height": String(session.screenHeight),
    "effective_type": "4g",
    "round_trip_time": "50",
    "webid": session.webid,
    "msToken": session.msToken || "",
    "pc_libra_divert": "1",
    "support_h265": "1",
    "support_dash": "1",
  };

  if (session.verifyFp) {
    params["verifyFp"] = session.verifyFp;
    params["fp"] = session.fp || session.verifyFp;
  }
  if (session.uifid) {
    params["uifid"] = session.uifid;
  }

  return params;
}

/**
 * # Xây dựng Headers cho request Douyin
 */
export function buildHeaders(session: DouyinSession, referer?: string): Record<string, string> {
  return {
    "Host": "www.douyin.com",
    "Origin": "https://www.douyin.com",
    "Referer": referer || "https://www.douyin.com/",
    "User-Agent": session.userAgent,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    ...getClientHintsHeaders(session.userAgent),
    "Cookie": session.cookieString,
  };
}

/**
 * # Phân loại lỗi Douyin API
 */
export function classifyDouyinError(res: any): void {
  if (!res) return;
  const statusCode = res.status_code;
  if (statusCode === undefined || statusCode === 0) {
    return;
  }
  const msg = res.status_msg || "Unknown error";

  // Lỗi 2483 / 2096: Cần xác thực session / hết hạn cookie
  if (statusCode === 2483 || statusCode === 2096) {
    throw new SessionExpiredError(`Session expired or blocked by Douyin (status_code ${statusCode}): ${msg}`);
  }
  // Lỗi 2004: Tạm thời chặn IP
  if (statusCode === 2004) {
    throw new IPBlockError(`IP temporarily blocked by Douyin (status_code ${statusCode}): ${msg}`);
  }

  throw new DataFetchError(`Douyin API error (status_code ${statusCode}): ${msg}`);
}

/**
 * # Gửi request HTTP JSON đến Douyin API
 */
export async function requestJson(
  url: string,
  session: DouyinSession,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<any> {
  const headers = {
    ...buildHeaders(session, options.headers?.Referer),
    ...options.headers,
  };

  const fetchOptions: any = {
    method: options.method || "GET",
    headers,
    signal: AbortSignal.timeout(15000),
  };

  if (options.body) {
    fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  console.log("Fetching URL:", redactUrl(url));

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
        signal: AbortSignal.timeout(15000),
      };
      if (fetchOptions.body) {
        nativeOpts.body = fetchOptions.body;
      }
      if (dispatcher) {
        nativeOpts.dispatcher = dispatcher;
      }
      const res = await fetch(url, nativeOpts);
      responseText = await res.text();
      console.log(`Native HTTP status: ${res.status} for URL: ${redactUrl(url)}`);
    } catch (err) {
      console.log(`Native fetch error: ${(err as Error).message}`);
    }
  }

  if (!responseText) {
    throw new Error("Yêu cầu thất bại: Không nhận được phản hồi từ impit hoặc trình duyệt fallback.");
  }

  let cleanText = responseText.trim();
  if (/^[0-9a-fA-F]+\r?\n/.test(cleanText)) {
    cleanText = cleanText.replace(/^[0-9a-fA-F]+\r?\n/, "").trim();
  }
  const lastBrace = cleanText.lastIndexOf("}");
  if (lastBrace !== -1) {
    cleanText = cleanText.substring(0, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleanText);
    classifyDouyinError(parsed);
    return parsed;
  } catch (err) {
    if (err instanceof SessionExpiredError || err instanceof IPBlockError || err instanceof DataFetchError) {
      throw err;
    }
    throw new Error(`JSON parse error: ${(err as Error).message}. Response text: ${responseText.substring(0, 300)}`);
  }
}

/**
 * # Thực hiện gọi GET request đến Douyin API và tự động ký a_bogus
 */
export async function douyinGet(
  uri: string,
  extraParams: Record<string, string>,
  session: DouyinSession,
  opts: { sign?: boolean; referer?: string } = {}
): Promise<any> {
  const params = { ...buildCommonParams(session), ...extraParams };
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const shouldSign = opts.sign !== false;
  console.log(`[Douyin GET] Executing API: ${uri}. Signing enabled: ${shouldSign}`);
  const finalUrl = shouldSign
    ? `https://www.douyin.com${uri}?${queryString}&a_bogus=${signDetail(queryString, session.userAgent)}`
    : `https://www.douyin.com${uri}?${queryString}`;

  return requestJson(finalUrl, session, opts.referer ? { headers: { Referer: opts.referer } } : {});
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
 * # Helper dừng luồng
 */
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const CRAWL_SLEEP_MS = 1500;

