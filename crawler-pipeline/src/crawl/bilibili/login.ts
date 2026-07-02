/**
 * # Luồng đăng nhập Bilibili qua CloakBrowser
 */

import type { BrowserContext, Page } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";

export class BilibiliLogin implements ILogin {
  private browserContext!: BrowserContext;
  private contextPage: Page | null = null;
  private cookieStr: string;
  private scanQrcodeTimeoutMs: number;

  constructor(options: {
    cookieStr?: string;
    scanQrcodeTimeoutMs?: number;
  } = {}) {
    this.cookieStr = options.cookieStr || "";
    this.scanQrcodeTimeoutMs = options.scanQrcodeTimeoutMs || 120000;
  }

  /**
   * # Khởi đầu quy trình đăng nhập Bilibili
   */
  async begin(context: BrowserContext): Promise<LoginResult> {
    this.browserContext = context;
    const pages = context.pages();
    this.contextPage = pages[0] || await context.newPage();

    await this.contextPage.goto("https://www.bilibili.com", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    if (this.cookieStr) {
      return this.loginByCookies(context);
    }

    return this.loginByQrcode(context);
  }

  /**
   * # Đăng nhập bằng mã QR Code Bilibili
   */
  async loginByQrcode(context: BrowserContext): Promise<LoginResult> {
    this.browserContext = context;
    if (!this.contextPage) {
      return { success: false, cookies: [], errorMessage: "Không tìm thấy trang trình duyệt" };
    }
    try {
      await this.popupLoginDialog();
      const qrcodeSelector = "xpath=//div[@class='login-scan-box']//img";
      await this.contextPage.waitForSelector(qrcodeSelector, { timeout: 15000 });
      console.log("Vui lòng quét mã QR trên màn hình trình duyệt để đăng nhập Bilibili...");
      const loginSuccess = await this.waitForLoginState();
      if (!loginSuccess) {
        const cookies = await this.browserContext.cookies();
        return {
          success: true,
          cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
          errorMessage: "Không hoàn thành quét mã QR. Tiếp tục với cookie khách."
        };
      }
      return this.extractLoginResult();
    } catch (err) {
      const cookies = await this.browserContext.cookies();
      return {
        success: true,
        cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
        errorMessage: (err as Error).message
      };
    }
  }

  /**
   * # Đăng nhập bằng cookie chuỗi nạp sẵn cho Bilibili
   */
  async loginByCookies(context: BrowserContext): Promise<LoginResult> {
    this.browserContext = context;
    const cookieDict = this.parseCookieString(this.cookieStr);

    const cookieObjects = Object.entries(cookieDict).map(([name, value]) => ({
      name,
      value,
      domain: ".bilibili.com",
      path: "/",
    }));

    await context.addCookies(cookieObjects);

    const loginSuccess = await this.waitForLoginState();
    if (!loginSuccess) {
      return { success: false, cookies: [], errorMessage: "Cookie cung cấp không hợp lệ hoặc đã hết hạn" };
    }

    return this.extractLoginResult();
  }

  /**
   * # Mở hộp thoại đăng nhập Bilibili
   */
  private async popupLoginDialog(): Promise<void> {
    if (!this.contextPage) return;

    const dialogSelector = "xpath=//div[@class='bili-mini-login-right']";
    try {
      await this.contextPage.waitForSelector(dialogSelector, { timeout: 5000 });
    } catch {
      const loginBtn = this.contextPage.locator("xpath=//div[@class='right-entry__outside go-login-btn']//div");
      await loginBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  /**
   * # Chờ đợi trạng thái đăng nhập được xác lập thành công
   */
  private async waitForLoginState(): Promise<boolean> {
    const maxAttempts = Math.floor(this.scanQrcodeTimeoutMs / 1000);

    for (let i = 0; i < maxAttempts; i++) {
      const cookies = await this.browserContext.cookies();
      const hasSess = cookies.some(c => (c.name === "SESSDATA" && c.value) || (c.name === "DedeUserID" && c.value));
      if (hasSess) {
        return true;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    return false;
  }

  /**
   * # Trích xuất và định dạng kết quả cookie đăng nhập
   */
  private async extractLoginResult(): Promise<LoginResult> {
    const cookies = await this.browserContext.cookies();
    return {
      success: true,
      cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
    };
  }

  /**
   * # Phân tách chuỗi cookie thành dạng đối tượng key-value
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
