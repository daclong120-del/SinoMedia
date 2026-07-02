/**
 * # Luồng đăng nhập Kuaishou — QR code, cookie
 */

import type { BrowserContext } from "playwright-core";
import type { ILogin, LoginResult } from "../../base/base_login.js";

export class KuaishouLogin implements ILogin {
  async begin(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: KuaishouLogin.begin");
  }

  async loginByQrcode(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: KuaishouLogin.loginByQrcode");
  }

  async loginByCookies(_context: BrowserContext): Promise<LoginResult> {
    throw new Error("Chưa triển khai: KuaishouLogin.loginByCookies");
  }
}
