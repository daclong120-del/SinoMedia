/**
 * # Luồng đăng nhập Weibo — Cookie
 */

import type { BrowserContext, Page } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";
import { parseCookieString } from "../../utils/crawler.js";

export class WeiboLogin implements ILogin {
  private cookieStr: string;
  private contextPage: Page | null = null;

  constructor(options: { cookieStr?: string } = {}) {
    this.cookieStr = options.cookieStr || process.env.WEIBO_COOKIE || "";
  }

  async begin(context: BrowserContext): Promise<LoginResult> {
    const pages = context.pages();
    this.contextPage = pages[0] || await context.newPage();

    if (this.cookieStr) {
      return this.loginByCookies(context);
    }

    return {
      success: false,
      cookies: [],
      errorMessage: "Chưa cấu hình WEIBO_COOKIE trong môi trường hoặc tham số đầu vào"
    };
  }

  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    return {
      success: false,
      cookies: [],
      errorMessage: "Quy trình đăng nhập qua QR Code không được kích hoạt cho Weibo"
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

      // Thiết lập Cookie cho tất cả các domain con của Weibo để đảm bảo quyền truy cập chéo
      const domains = [".weibo.cn", ".weibo.com", "m.weibo.cn"];
      const cookieObjects = domains.flatMap(domain =>
        Object.entries(cookieDict).map(([name, value]) => ({
          name,
          value,
          domain,
          path: "/",
        }))
      );

      await context.addCookies(cookieObjects);

      // Đi tới trang chủ di động của Weibo
      await this.contextPage.goto("https://m.weibo.cn", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await new Promise(r => setTimeout(r, 3000));

      // Kiểm tra trạng thái đăng nhập qua API cấu hình
      const isLoggedIn = await this.contextPage.evaluate(async () => {
        try {
          const res = await fetch("/api/config");
          const data = await res.json();
          return data.data?.login === true;
        } catch {
          return false;
        }
      });

      if (!isLoggedIn) {
        // Dự phòng: Kiểm tra sự tồn tại của Cookie SSOLoginState hoặc WBPSESS
        const cookies = await context.cookies();
        const hasSess = cookies.some(c => c.name === "SSOLoginState" || c.name === "WBPSESS");
        if (!hasSess) {
          return {
            success: false,
            cookies: [],
            errorMessage: "Không thể xác thực trạng thái đăng nhập của Cookie cung cấp"
          };
        }
      }

      const cookies = await context.cookies();
      return {
        success: true,
        cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
      };
    } catch (err) {
      return {
        success: false,
        cookies: [],
        errorMessage: `Lỗi đăng nhập Cookie: ${(err as Error).message}`
      };
    }
  }
}
