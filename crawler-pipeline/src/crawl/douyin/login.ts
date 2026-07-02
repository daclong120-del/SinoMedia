/**
 * # Luồng đăng nhập Douyin qua CloakBrowser
 * Tương đương media_platform/douyin/login.py trong ChinaMediaCrawler
 * Hỗ trợ: đăng nhập bằng cookie thủ công, QR code, kiểm tra trạng thái đăng nhập
 */

import type { BrowserContext, Page } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";

export class DouyinLogin implements ILogin {
  private browserContext: BrowserContext;
  private contextPage: Page | null = null;
  private cookieStr: string;
  private scanQrcodeTimeoutMs: number;

  constructor(options: {
    browserContext: BrowserContext;
    cookieStr?: string;
    scanQrcodeTimeoutMs?: number;
  }) {
    this.browserContext = options.browserContext;
    this.cookieStr = options.cookieStr || "";
    this.scanQrcodeTimeoutMs = options.scanQrcodeTimeoutMs || 60_000;
  }

  /**
   * # Bắt đầu luồng đăng nhập — chọn phương thức và kiểm tra kết quả
   */
  async begin(context: BrowserContext): Promise<LoginResult> {
    this.browserContext = context;
    const pages = context.pages();
    this.contextPage = pages[0] || await context.newPage();

    await this.contextPage.goto("https://www.douyin.com", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    if (this.cookieStr) {
      return this.loginByCookies(context);
    }

    return this.loginByQrcode(context);
  }

  /**
   * # Đăng nhập bằng QR code — hiển thị QR và chờ người dùng quét
   */
  async loginByQrcode(context: BrowserContext): Promise<LoginResult> {
    if (!this.contextPage) {
      return { success: false, cookies: [], errorMessage: "Không tìm thấy trang trình duyệt" };
    }

    try {
      await this.popupLoginDialog();

      const qrcodeSelector = "xpath=//div[@id='animate_qrcode_container']//img";
      await this.contextPage.waitForSelector(qrcodeSelector, { timeout: 10_000 });

      console.log("Vui lòng quét mã QR trên trình duyệt để đăng nhập Douyin...");

      const loginSuccess = await this.waitForLoginState();
      if (!loginSuccess) {
        return { success: false, cookies: [], errorMessage: "Hết thời gian chờ quét QR code" };
      }

      return this.extractLoginResult();
    } catch (err) {
      return { success: false, cookies: [], errorMessage: (err as Error).message };
    }
  }

  /**
   * # Đăng nhập bằng cookie string thủ công
   */
  async loginByCookies(context: BrowserContext): Promise<LoginResult> {
    const cookieDict = this.parseCookieString(this.cookieStr);

    const cookieObjects = Object.entries(cookieDict).map(([name, value]) => ({
      name,
      value,
      domain: ".douyin.com",
      path: "/",
    }));

    await context.addCookies(cookieObjects);

    const loginSuccess = await this.waitForLoginState();
    if (!loginSuccess) {
      return { success: false, cookies: [], errorMessage: "Cookie không hợp lệ hoặc đã hết hạn" };
    }

    return this.extractLoginResult();
  }

  /**
   * # Mở hộp thoại đăng nhập nếu không tự bật
   */
  private async popupLoginDialog(): Promise<void> {
    if (!this.contextPage) return;

    const dialogSelector = "xpath=//div[@id='login-panel-new']";
    try {
      await this.contextPage.waitForSelector(dialogSelector, { timeout: 10_000 });
    } catch {
      const loginBtn = this.contextPage.locator("xpath=//p[text() = '登录']");
      await loginBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }
  }

  /**
   * # Chờ và kiểm tra trạng thái đăng nhập thành công
   */
  private async waitForLoginState(): Promise<boolean> {
    const maxAttempts = Math.floor(this.scanQrcodeTimeoutMs / 1000);

    for (let i = 0; i < maxAttempts; i++) {
      const cookies = await this.browserContext.cookies();
      const hasLoginCookie = cookies.some(c => c.name === "LOGIN_STATUS" && c.value === "1");

      if (hasLoginCookie) return true;

      if (this.contextPage) {
        try {
          const hasUserLogin = await this.contextPage.evaluate(() => {
            try {
              return localStorage.getItem("HasUserLogin") === "1";
            } catch {
              return false;
            }
          });
          if (hasUserLogin) return true;
        } catch {}
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    return false;
  }

  /**
   * # Trích xuất kết quả đăng nhập (cookies + msToken)
   */
  private async extractLoginResult(): Promise<LoginResult> {
    const cookies = await this.browserContext.cookies();

    let msToken = "";
    if (this.contextPage) {
      try {
        msToken = await this.contextPage.evaluate(() => {
          try {
            return localStorage.getItem("msToken") || localStorage.getItem("xmst") || "";
          } catch {
            return "";
          }
        });
      } catch {}
    }

    return {
      success: true,
      cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
      msToken,
    };
  }

  /**
   * # Chuyển cookie string dạng "key=value; key2=value2" thành object
   */
  private parseCookieString(cookieStr: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!cookieStr) return result;

    for (const pair of cookieStr.split(";")) {
      const trimmed = pair.trim();
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const name = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        if (name) result[name] = value;
      }
    }
    return result;
  }
}
