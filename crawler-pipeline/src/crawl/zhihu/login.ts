/**
 * # Luồng đăng nhập Zhihu — Cookie
 */

import type { BrowserContext, Page } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";
import { parseCookieString } from "../../utils/crawler.js";
import { ZhihuClient } from "./client.js";

export class ZhihuLogin implements ILogin {
  private cookieStr: string;
  private contextPage: Page | null = null;
  private client: ZhihuClient;

  constructor(options: { cookieStr?: string } = {}) {
    this.cookieStr = options.cookieStr || process.env.ZHIHU_COOKIE || "";
    this.client = new ZhihuClient();
  }

  async begin(context: BrowserContext): Promise<LoginResult> {
    const pages = context.pages();
    this.contextPage = pages[0] || (await context.newPage());
    this.client.setPage(this.contextPage);

    if (this.cookieStr) {
      return this.loginByCookies(context);
    }

    return {
      success: false,
      cookies: [],
      errorMessage: "Chưa cấu hình ZHIHU_COOKIE trong tham số đầu vào hoặc biến môi trường",
    };
  }

  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    return {
      success: false,
      cookies: [],
      errorMessage: "Quy trình đăng nhập qua QR Code chưa hỗ trợ tự động cho Zhihu",
    };
  }

  async loginByCookies(context: BrowserContext): Promise<LoginResult> {
    if (!this.cookieStr) {
      return {
        success: false,
        cookies: [],
        errorMessage: "Cookie rỗng, không thể đăng nhập",
      };
    }

    if (!this.contextPage) {
      return {
        success: false,
        cookies: [],
        errorMessage: "Không tìm thấy trang trình duyệt",
      };
    }

    try {
      const cookieDict = parseCookieString(this.cookieStr);

      // Thêm cookie cho tất cả các domain chính của Zhihu
      const domains = [".zhihu.com", "www.zhihu.com"];
      const cookieObjects = domains.flatMap((domain) =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );

      await context.addCookies(cookieObjects);

      // Điều hướng đến trang chủ Zhihu
      await this.contextPage.goto("https://www.zhihu.com", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 3000));

      const cookies = await context.cookies();

      // Cập nhật Cookie cho client và kiểm tra trạng thái đăng nhập qua pong()
      await this.client.updateCookies(
        cookies.map((c) => ({ name: c.name, value: c.value, domain: c.domain }))
      );

      const isActive = await this.client.pong();
      if (!isActive) {
        return {
          success: false,
          cookies: [],
          errorMessage: "Kiểm tra API pong cho Zhihu thất bại. Cookie có thể đã hết hạn hoặc bị chặn.",
        };
      }

      return {
        success: true,
        cookies: cookies.map((c) => ({ name: c.name, value: c.value, domain: c.domain })),
      };
    } catch (err) {
      return {
        success: false,
        cookies: [],
        errorMessage: `Lỗi đăng nhập Cookie Zhihu: ${(err as Error).message}`,
      };
    }
  }
}
