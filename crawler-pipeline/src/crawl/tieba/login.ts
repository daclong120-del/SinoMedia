/**
 * # Luồng đăng nhập Tieba — QR code, cookie
 */

import type { BrowserContext, Page } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";
import { parseCookieString } from "../../utils/crawler.js";

export class TiebaLogin implements ILogin {
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

  async begin(context: BrowserContext): Promise<LoginResult> {
    this.browserContext = context;
    const pages = context.pages();
    this.contextPage = pages[0] || await context.newPage();

    await this.contextPage.goto("https://tieba.baidu.com", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    if (this.cookieStr) {
      return this.loginByCookies(context);
    }

    return this.loginByQrcode(context);
  }

  async loginByQrcode(context: BrowserContext): Promise<LoginResult> {
    this.browserContext = context;
    if (!this.contextPage) {
      return { success: false, cookies: [], errorMessage: "Không tìm thấy trang trình duyệt" };
    }

    try {
      const qrcodeSelector = "xpath=//img[@class='tang-pass-qrcode-img']";
      
      // Try to find the QR code, if not present, trigger the login dialog
      try {
        await this.contextPage.waitForSelector(qrcodeSelector, { timeout: 5000 });
      } catch {
        const loginBtn = this.contextPage.locator("xpath=//li[@class='u_login']");
        await loginBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        await this.contextPage.waitForSelector(qrcodeSelector, { timeout: 15000 });
      }

      console.log("Vui lòng quét mã QR trên màn hình trình duyệt để đăng nhập Baidu Tieba...");

      const loginSuccess = await this.waitForLoginState();
      if (!loginSuccess) {
        return {
          success: false,
          cookies: [],
          errorMessage: "Hết thời gian chờ quét mã QR đăng nhập."
        };
      }

      // Successful login, wait a bit for redirection
      await new Promise(r => setTimeout(r, 5000));
      return this.extractLoginResult();
    } catch (err) {
      return {
        success: false,
        cookies: [],
        errorMessage: (err as Error).message
      };
    }
  }

  async loginByCookies(context: BrowserContext): Promise<LoginResult> {
    this.browserContext = context;
    const cookieDict = parseCookieString(this.cookieStr);

    const cookieObjects = Object.entries(cookieDict).map(([name, value]) => ({
      name,
      value,
      domain: ".baidu.com",
      path: "/",
    }));

    await context.addCookies(cookieObjects);

    const loginSuccess = await this.waitForLoginState();
    if (!loginSuccess) {
      return { success: false, cookies: [], errorMessage: "Cookie cung cấp không hợp lệ hoặc đã hết hạn" };
    }

    return this.extractLoginResult();
  }

  private async waitForLoginState(): Promise<boolean> {
    const maxAttempts = Math.floor(this.scanQrcodeTimeoutMs / 1000);

    for (let i = 0; i < maxAttempts; i++) {
      const cookies = await this.browserContext.cookies();
      const hasSess = cookies.some(c => (c.name === "STOKEN" && c.value) || (c.name === "PTOKEN" && c.value) || (c.name === "BDUSS" && c.value));
      if (hasSess) {
        return true;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    return false;
  }

  private async extractLoginResult(): Promise<LoginResult> {
    const cookies = await this.browserContext.cookies();
    return {
      success: true,
      cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
    };
  }
}
