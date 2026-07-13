import { join } from "node:path";
import { chromium } from "playwright";
import { DouyinSession } from "./session.js";

export interface BootstrapOptions {
  profileDir?: string;
  headless?: boolean;
  rawCookies?: any[];
  rawWebId?: string;
  rawMsToken?: string;
  rawVerifyFp?: string;
  timeoutMs?: number;
}

/**
 * # Khởi chạy Browser và làm giàu (enrich) session bằng Playwright Persistent Context
 */
export async function bootstrapDouyinSession(options: BootstrapOptions = {}): Promise<DouyinSession> {
  const profileDir = options.profileDir || join(process.cwd(), "output", "browser-profiles", "douyin-default");
  const headless = options.headless !== false;
  const timeoutMs = options.timeoutMs || 30000;

  console.log(`[Bootstrap] Launching Chromium Persistent Context at: ${profileDir} (headless: ${headless})`);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1920, height: 1080 },
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  try {
    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    let capturedMsToken = "";

    // Lắng nghe các yêu cầu mạng để bắt msToken từ tham số truy vấn
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("msToken=")) {
        try {
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get("msToken");
          if (token && token.length > 20) {
            capturedMsToken = token;
          }
        } catch {}
      }
    });

    // Lắng nghe các phản hồi mạng để bắt msToken từ set-cookie
    page.on("response", (res) => {
      try {
        const headers = res.headers();
        const setCookie = headers["set-cookie"];
        if (setCookie && setCookie.includes("msToken=")) {
          const match = setCookie.match(/msToken=([^;]+)/);
          if (match) {
            capturedMsToken = match[1];
          }
        }
      } catch {}
    });

    // 1. Nạp cookies thô vào context trước nếu có
    if (options.rawCookies && options.rawCookies.length > 0) {
      console.log(`[Bootstrap] Injecting ${options.rawCookies.length} raw cookies into browser context...`);
      // Standardize cookies for Playwright format
      const formattedCookies = options.rawCookies.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain.startsWith(".") ? c.domain : `.${c.domain}`,
        path: c.path || "/",
        secure: c.secure !== false,
        httpOnly: c.httpOnly === true,
        expires: c.expirationDate || c.expires || -1
      }));
      await context.addCookies(formattedCookies);
    }

    console.log("[Bootstrap] Navigating to https://www.douyin.com ...");
    await page.goto("https://www.douyin.com", { waitUntil: "domcontentloaded" });

    console.log("[Bootstrap] Waiting for page hydration and requests to settle...");
    // Wait for ttwid or main cookies to settle
    await page.waitForTimeout(5000);

    // 2. Trích xuất thông tin
    console.log("[Bootstrap] Extracting session details from browser context...");
    const cookies = await context.cookies([
      "https://www.douyin.com",
      "https://douyin.com"
    ]);

    const localStorage: Record<string, string> = await page.evaluate(() => {
      const store: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) store[key] = window.localStorage.getItem(key) || "";
      }
      return store;
    });

    const userAgent = await page.evaluate(() => navigator.userAgent);
    const platform = await page.evaluate(() => navigator.platform);
    const language = await page.evaluate(() => navigator.language);
    const screenWidth = await page.evaluate(() => screen.width);
    const screenHeight = await page.evaluate(() => screen.height);

    // 3. Phân tích các token cần thiết
    const cookieMap = new Map<string, string>();
    for (const c of cookies) {
      if (c && c.name) {
        cookieMap.set(c.name, c.value);
      }
    }

    const webid = cookieMap.get("__ac_webid") || cookieMap.get("dy_did") || options.rawWebId || "";
    const msToken = capturedMsToken || localStorage.xmst || cookieMap.get("msToken") || options.rawMsToken || "";
    const xmst = localStorage.xmst || cookieMap.get("xmst") || "";
    const verifyFp = cookieMap.get("s_v_web_id") || options.rawVerifyFp || "";
    const fp = verifyFp;
    const uifid = cookieMap.get("uifid") || "";

    // Parse Chrome version
    let browserVersion = "120.0.0.0";
    const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
    if (chromeMatch) {
      browserVersion = chromeMatch[1];
    }

    // Build standard cookie string
    const cookieString = cookies
      .filter((c: any) => c.name && c.name.trim() !== "")
      .map((c: any) => `${c.name}=${c.value}`)
      .join("; ");

    const session: DouyinSession = {
      cookies,
      cookieString,
      userAgent,
      msToken,
      xmst,
      webid,
      verifyFp,
      fp,
      uifid,
      browserName: "Chrome",
      browserVersion,
      browserPlatform: platform,
      browserLanguage: language,
      screenWidth,
      screenHeight,
      capturedAt: new Date().toISOString(),
      source: "playwright-persistent"
    };

    console.log("[Bootstrap] Session details enriched successfully!");
    return session;
  } finally {
    await context.close();
  }
}
