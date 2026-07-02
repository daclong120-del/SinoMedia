/**
 * # Luồng đăng nhập XHS — QR code, cookie
 */

import type { BrowserContext } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";

export class XhsLogin implements ILogin {
  /**
   * # Bắt đầu luồng đăng nhập XHS
   */
  async begin(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: XhsLogin.begin");
  }

  /**
   * # Đăng nhập XHS bằng QR code
   */
  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: XhsLogin.loginByQrcode");
  }

  /**
   * # Đăng nhập XHS bằng cookie thủ công
   */
  async loginByCookies(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: XhsLogin.loginByCookies");
  }
}
