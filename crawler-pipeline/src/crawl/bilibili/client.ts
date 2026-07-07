/**
 * # Client HTTP cho Bilibili để gửi request và xử lý session
 */

import { CONFIG } from "../../config.js";
import { ProxyAgent } from "undici";
import { getWbiSign } from "../../sign/bilibili_sign.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
let activeUserAgent = DEFAULT_USER_AGENT;

let wbiImgKey = "";
let wbiSubKey = "";
let wbiKeysFetchedAt = 0;
const WBI_CACHE_TTL = 3600000;

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

let tempCookieOverride = "";

/**
 * # Ghi đè cookie Bilibili tạm thời từ pool tài khoản
 */
export function setBilibiliCookie(cookie: string): void {
  tempCookieOverride = cookie;
}

/**
 * # Đọc cookie Bilibili từ bộ nhớ tạm, môi trường hoặc tệp session
 */
export async function loadBilibiliCookie(): Promise<string> {
  if (tempCookieOverride) {
    return tempCookieOverride;
  }
  if (process.env.BILIBILI_COOKIE) {
    return process.env.BILIBILI_COOKIE;
  }
  try {
    const sessionPath = join(process.cwd(), "output", "bilibili_session.json");
    const content = await readFile(sessionPath, "utf8");
    const data = JSON.parse(content);
    return data.cookie || "";
  } catch {
    return "";
  }
}

/**
 * # Lưu cookie Bilibili vào tệp session
 */
export async function saveBilibiliCookie(cookie: string): Promise<void> {
  const sessionPath = join(process.cwd(), "output", "bilibili_session.json");
  await mkdir(join(process.cwd(), "output"), { recursive: true });
  await writeFile(sessionPath, JSON.stringify({ cookie, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}

let browserContext: any = null;
let browserPage: any = null;

/**
 * # Lấy trang browser từ CloakBrowser dùng để nạp cookie và đăng nhập
 */
async function getBrowserPage() {
  if (browserPage) {
    return browserPage;
  }
  const { launchPersistentContext } = await import("cloakbrowser");
  const { join } = await import("node:path");
  const profileDir = join(process.cwd(), "output", "profiles", "bilibili");
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
    const cookieStr = await loadBilibiliCookie();
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
        domain: ".bilibili.com",
        path: "/",
      }));
      await browserContext.addCookies(cookieObjects);
    }
  } catch (err) {
    console.log("Không thể nạp cookie vào trình duyệt:", err);
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
  await browserPage.goto("https://www.bilibili.com", {
    waitUntil: "load",
    timeout: 60000,
  }).catch(() => {});

  const actualCookies = await browserContext.cookies();
  const actualCookieStr = actualCookies.map((c: any) => `${c.name}=${c.value}`).join("; ");
  if (!process.env.BILIBILI_COOKIE) {
    await saveBilibiliCookie(actualCookieStr);
  }

  return browserPage;
}

/**
 * # Lấy browserContext phục vụ đăng nhập
 */
export async function getBrowserContext() {
  if (!browserContext) {
    await getBrowserPage();
  }
  return browserContext;
}

/**
 * # Đóng CloakBrowser giải phóng tài nguyên khi hoàn thành đăng nhập
 */
export async function closeBrowser(): Promise<void> {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
    browserPage = null;
  }
}

/**
 * # Gửi request HTTP thô lên API Bilibili và trả về JSON data
 */
export async function bilibiliRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<any> {
  const cookieStr = await loadBilibiliCookie();
  const headers = {
    "User-Agent": activeUserAgent,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.bilibili.com/",
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

  let responseText = "";
  const inst = await getImpitInstance();
  if (inst) {
    try {
      const response = await inst.fetch(url, fetchOptions);
      responseText = await response.text();
    } catch (err) {
      console.log(`Lỗi impit khi gửi request: ${(err as Error).message}`);
    }
  } else {
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
      const res = await fetch(url, nativeOpts);
      responseText = await res.text();
    } catch (err) {
      console.log(`Lỗi native fetch khi gửi request: ${(err as Error).message}`);
    }
  }

  if (!responseText) {
    throw new Error(`Không nhận được phản hồi HTTP từ URL: ${url}`);
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (err) {
    throw new Error(`Không thể giải mã JSON từ phản hồi HTTP. Nội dung: ${responseText.substring(0, 300)}`);
  }

  if (data.code !== undefined && data.code !== 0) {
    throw new Error(`API Bilibili trả về mã lỗi ${data.code}: ${data.message || "Không rõ nguyên nhân"}`);
  }

  return data.data ?? data;
}

/**
 * # Kiểm tra trạng thái đăng nhập Bilibili
 */
export async function pong(): Promise<boolean> {
  console.log("Đang kiểm tra trạng thái đăng nhập Bilibili...");
  try {
    const resp = await bilibiliRequest("https://api.bilibili.com/x/web-interface/nav", {
      headers: {
        "Referer": "https://www.bilibili.com/"
      }
    });
    if (resp && typeof resp.isLogin === "boolean") {
      console.log(`Trạng thái đăng nhập Bilibili: Hoạt động (isLogin: ${resp.isLogin})`);
      return true;
    }
    console.log("Trạng thái đăng nhập Bilibili: Không xác định");
    return false;
  } catch (err) {
    console.log(`Kiểm tra trạng thái đăng nhập thất bại hoặc bị chặn: ${(err as Error).message}`);
    return false;
  }
}

/**
 * # Lấy img_key và sub_key từ Bilibili API để phục vụ ký WBI
 */
async function fetchWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  if (browserPage) {
    try {
      const keys = await browserPage.evaluate(() => {
        const getUrlKey = (url: string) => {
          if (!url) return "";
          const parts = url.split("/");
          const filename = parts[parts.length - 1];
          return filename.split(".")[0];
        };
        const local = window.localStorage;
        const wbiImgUrls = local.getItem("wbi_img_urls");
        if (wbiImgUrls && wbiImgUrls.includes("-")) {
          const [img, sub] = wbiImgUrls.split("-");
          return { imgKey: getUrlKey(img), subKey: getUrlKey(sub) };
        }
        const img = local.getItem("wbi_img_url");
        const sub = local.getItem("wbi_sub_url");
        if (img && sub) {
          return { imgKey: getUrlKey(img), subKey: getUrlKey(sub) };
        }
        return null;
      });
      if (keys && keys.imgKey && keys.subKey) {
        return keys;
      }
    } catch (err) {
      console.log(`Lỗi khi đọc WBI keys từ localStorage: ${(err as Error).message}`);
    }
  }

  const resp = await bilibiliRequest("https://api.bilibili.com/x/web-interface/nav", {
    headers: {
      "Referer": "https://www.bilibili.com/"
    }
  });

  const wbiImg = resp.wbi_img;
  if (!wbiImg || !wbiImg.img_url || !wbiImg.sub_url) {
    throw new Error("Không thể lấy thông tin wbi_img từ nav API");
  }

  const imgUrl = wbiImg.img_url;
  const subUrl = wbiImg.sub_url;

  const imgKey = imgUrl.substring(imgUrl.lastIndexOf("/") + 1).split(".")[0];
  const subKey = subUrl.substring(subUrl.lastIndexOf("/") + 1).split(".")[0];

  return { imgKey, subKey };
}

/**
 * # Thực hiện gửi request GET đến API Bilibili và tự động ký WBI
 */
export async function bilibiliGet(
  uri: string,
  extraParams: Record<string, any> = {},
  enableParamsSign = true
): Promise<any> {
  let params = { ...extraParams };

  if (enableParamsSign) {
    const now = Date.now();
    if (!wbiImgKey || !wbiSubKey || now - wbiKeysFetchedAt > WBI_CACHE_TTL) {
      const keys = await fetchWbiKeys();
      wbiImgKey = keys.imgKey;
      wbiSubKey = keys.subKey;
      wbiKeysFetchedAt = now;
    }
    params = getWbiSign(params, wbiImgKey, wbiSubKey);
  }

  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const finalUrl = queryString ? `https://api.bilibili.com${uri}?${queryString}` : `https://api.bilibili.com${uri}`;

  return bilibiliRequest(finalUrl);
}

/**
 * # Tải xuống file media (video/audio) và trả về Buffer
 */
export async function downloadMedia(url: string): Promise<Buffer> {
  const headers = {
    "User-Agent": activeUserAgent,
    "Referer": "https://www.bilibili.com/",
  };

  const inst = await getImpitInstance();
  if (inst) {
    const response = await inst.fetch(url, {
      method: "GET",
      headers,
    });
    if (!response.ok) {
      throw new Error(`Không thể tải media qua impit từ ${url}, mã HTTP: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    const fetchOpts: any = {
      method: "GET",
      headers,
    };
    if (dispatcher) {
      fetchOpts.dispatcher = dispatcher;
    }
    const response = await fetch(url, fetchOpts);
    if (!response.ok) {
      throw new Error(`Không thể tải media từ ${url}, mã HTTP: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
