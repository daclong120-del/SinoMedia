import { loadSession as loadLocalSessionRaw, SessionData } from "../../sign/session_store.js";
import { getWebId, DEFAULT_USER_AGENT } from "./http_client.js";

export interface DouyinSession {
  cookies: any[];
  cookieString: string;
  userAgent: string;
  msToken: string;
  xmst: string;
  webid: string;
  verifyFp: string;
  fp: string;
  uifid: string;
  browserName: string;
  browserVersion: string;
  browserPlatform: string;
  browserLanguage: string;
  screenWidth: number;
  screenHeight: number;
  capturedAt: string;
  source: string;
}

/**
 * # Phân tích chuỗi cookie thô thành mảng cookies
 */
export function parseCookieString(cookieStr: string): any[] {
  return cookieStr.split(";").map(part => {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const name = trimmed.substring(0, eqIdx);
      const value = trimmed.substring(eqIdx + 1);
      return { name, value, domain: ".douyin.com", path: "/" };
    }
    return null;
  }).filter(Boolean);
}

/**
 * # Tạo chuỗi cookie từ mảng cookies
 */
export function buildCookieString(cookies: any[]): string {
  return cookies
    .filter((c: any) => c.name && c.name.trim() !== "")
    .map((c: any) => `${c.name}=${c.value}`)
    .join("; ");
}

/**
 * # Tạo đối tượng DouyinSession từ dữ liệu cookie hoặc session thô
 */
export function createSessionFromRaw(
  cookiesOrData: any,
  source: string = "unknown"
): DouyinSession {
  let cookies: any[] = [];
  let userAgent = DEFAULT_USER_AGENT;
  let msToken = "";
  let xmst = "";
  let webid = "";
  let verifyFp = "";
  let fp = "";
  let uifid = "";
  let browserName = "Chrome";
  let browserVersion = "120.0.0.0";
  let browserPlatform = "Win32";
  let browserLanguage = "zh-CN";
  let screenWidth = 2560;
  let screenHeight = 1440;
  let capturedAt = new Date().toISOString();

  if (typeof cookiesOrData === "string") {
    cookies = parseCookieString(cookiesOrData);
  } else if (Array.isArray(cookiesOrData)) {
    cookies = cookiesOrData;
  } else if (cookiesOrData && typeof cookiesOrData === "object") {
    cookies = cookiesOrData.cookies || [];
    userAgent = cookiesOrData.userAgent || userAgent;
    msToken = cookiesOrData.msToken || "";
    xmst = cookiesOrData.xmst || "";
    webid = cookiesOrData.webid || "";
    verifyFp = cookiesOrData.verifyFp || "";
    fp = cookiesOrData.fp || verifyFp || "";
    uifid = cookiesOrData.uifid || "";
    browserName = cookiesOrData.browserName || "Chrome";
    browserVersion = cookiesOrData.browserVersion || "120.0.0.0";
    browserPlatform = cookiesOrData.browserPlatform || "Win32";
    browserLanguage = cookiesOrData.browserLanguage || "zh-CN";
    screenWidth = cookiesOrData.screenWidth || 2560;
    screenHeight = cookiesOrData.screenHeight || 1440;
    capturedAt = cookiesOrData.capturedAt || cookiesOrData.updatedAt || capturedAt;
  }

  const cookieStrMap = new Map<string, string>();
  for (const c of cookies) {
    if (c && c.name) {
      cookieStrMap.set(c.name, c.value);
    }
  }

  // Bổ sung các giá trị từ cookie nếu thiếu trong session object
  if (!webid) webid = cookieStrMap.get("__ac_webid") || cookieStrMap.get("dy_did") || cookieStrMap.get("webid") || "";
  if (!verifyFp) verifyFp = cookieStrMap.get("s_v_web_id") || cookieStrMap.get("verifyFp") || "";
  if (!fp) fp = verifyFp;
  if (!uifid) uifid = cookieStrMap.get("uifid") || "";
  if (!xmst) xmst = cookieStrMap.get("xmst") || "";
  if (!msToken) msToken = cookieStrMap.get("msToken") || "";

  // Tự động nhận diện nền tảng hệ điều hành từ User-Agent
  if (userAgent.includes("Windows")) {
    browserPlatform = "Win32";
  } else if (userAgent.includes("Macintosh")) {
    browserPlatform = "MacIntel";
  } else if (userAgent.includes("Linux")) {
    browserPlatform = "Linux";
  }

  const chromeVersionMatch = userAgent.match(/Chrome\/([\d.]+)/);
  if (chromeVersionMatch) {
    browserVersion = chromeVersionMatch[1];
  }

  const cookieString = buildCookieString(cookies);

  return {
    cookies,
    cookieString,
    userAgent,
    msToken,
    xmst,
    webid,
    verifyFp,
    fp,
    uifid,
    browserName,
    browserVersion,
    browserPlatform,
    browserLanguage,
    screenWidth,
    screenHeight,
    capturedAt,
    source,
  };
}
