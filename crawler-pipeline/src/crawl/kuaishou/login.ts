/**
 * # Luồng đăng nhập Kuaishou — Cookie
 */

import type { BrowserContext, Page } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";
import { parseCookieString } from "../../utils/crawler.js";
import { KuaishouClient } from "./client.js";

export class KuaishouLogin implements ILogin {
  private cookieStr: string;
  private contextPage: Page | null = null;
  private client: KuaishouClient;

  constructor(options: { cookieStr?: string } = {}) {
    this.cookieStr = options.cookieStr || process.env.KUAISHOU_COOKIE || "";
    this.client = new KuaishouClient();
  }

  async begin(context: BrowserContext): Promise<LoginResult> {
    const pages = context.pages();
    this.contextPage = pages[0] || await context.newPage();
    this.client.setPage(this.contextPage);

    if (this.cookieStr) {
      return this.loginByCookies(context);
    }

    return {
      success: false,
      cookies: [],
      errorMessage: "Chưa cấu hình KUAISHOU_COOKIE trong môi trường hoặc tham số đầu vào"
    };
  }

  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    return {
      success: false,
      cookies: [],
      errorMessage: "Quy trình đăng nhập qua QR Code chưa hỗ trợ tự động cho Kuaishou"
    };
  }

  async loginByCookies(context: BrowserContext): Promise<LoginResult> {
    if (!this.cookieStr) {
      return {
        success: false,
        cookies: [],
        errorMessage: "Cookie rỗng, không thể đăng nhập"
      };
    }

    if (!this.contextPage) {
      return {
        success: false,
        cookies: [],
        errorMessage: "Không tìm thấy trang trình duyệt"
      };
    }

    try {
      const cookieDict = parseCookieString(this.cookieStr);

      // Thiết lập Cookie cho tất cả các domain con của Kuaishou để đảm bảo quyền truy cập chéo
      const domains = [".kuaishou.com", "www.kuaishou.com"];
      const cookieObjects = domains.flatMap(domain =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );

      await context.addCookies(cookieObjects);

      // Đi tới trang chủ của Kuaishou
      await this.contextPage.goto("https://www.kuaishou.com/?isHome=1", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await new Promise(r => setTimeout(r, 3000));

      // Kiểm tra xem passToken có tồn tại hay không
      const cookies = await context.cookies();
      const hasToken = cookies.some(c => c.name === "passToken");
      if (!hasToken) {
        return {
          success: false,
          cookies: [],
          errorMessage: "Không tìm thấy cookie passToken cần thiết để xác thực Kuaishou"
        };
      }

      // Xác minh lại qua API client pong
      await this.client.updateCookies(cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })));
      const isActive = await this.client.pong(context);

      if (!isActive) {
        return {
          success: false,
          cookies: [],
          errorMessage: "Kiểm tra API pong cho Kuaishou trả về thất bại. Cookie có thể đã hết hạn."
        };
      }

      return {
        success: true,
        cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
      };
    } catch (err) {
      return {
        success: false,
        cookies: [],
        errorMessage: `Lỗi đăng nhập Cookie Kuaishou: ${(err as Error).message}`
      };
    }
  }
}
