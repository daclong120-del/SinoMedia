/**
 * # Luồng đăng nhập Weibo — QR code, cookie
 */

import type { BrowserContext } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";

export class WeiboLogin implements ILogin {
  async begin(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: WeiboLogin.begin");
  }

  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: WeiboLogin.loginByQrcode");
  }

  async loginByCookies(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: WeiboLogin.loginByCookies");
  }
}
