/**
 * # Luồng đăng nhập Bilibili — QR code, cookie
 */

import type { BrowserContext } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";

export class BilibiliLogin implements ILogin {
  /**
   * # Bắt đầu luồng đăng nhập Bilibili
   */
  async begin(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: BilibiliLogin.begin");
  }

  /**
   * # Đăng nhập Bilibili bằng QR code
   */
  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: BilibiliLogin.loginByQrcode");
  }

  /**
   * # Đăng nhập Bilibili bằng cookie thủ công
   */
  async loginByCookies(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: BilibiliLogin.loginByCookies");
  }
}
