import type { BrowserContext } from "playwright-core";

/**
 * # Giao diện trừu tượng cho luồng đăng nhập của mỗi platform
 * Hỗ trợ nhiều phương thức: QR code, cookie thủ công, SMS
 */
export interface ILogin {
  begin(context: BrowserContext): Promise<LoginResult>;
  loginByQrcode(context: BrowserContext): Promise<LoginResult>;
  loginByCookies(context: BrowserContext): Promise<LoginResult>;
}

export interface LoginResult {
  success: boolean;
  cookies: Array<{ name: string; value: string; domain?: string }>;
  msToken?: string;
  errorMessage?: string;
}
