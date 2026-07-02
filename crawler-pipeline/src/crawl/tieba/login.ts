/**
 * # Luồng đăng nhập Tieba — QR code, cookie
 */

import type { BrowserContext } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";

export class TiebaLogin implements ILogin {
  async begin(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: TiebaLogin.begin");
  }

  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: TiebaLogin.loginByQrcode");
  }

  async loginByCookies(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: TiebaLogin.loginByCookies");
  }
}
