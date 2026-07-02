/**
 * # Luồng đăng nhập Zhihu — QR code, cookie
 */

import type { BrowserContext } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";

export class ZhihuLogin implements ILogin {
  async begin(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: ZhihuLogin.begin");
  }

  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: ZhihuLogin.loginByQrcode");
  }

  async loginByCookies(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: ZhihuLogin.loginByCookies");
  }
}
