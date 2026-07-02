/**
 * # API client cho XHS — gửi HTTP request đến XHS API
 * Chữ ký bắt buộc: X-s, X-t, X-s-common
 */

import type { IApiClient, RequestOptions, CookieData } from "../../base/base_client.js";

export class XhsClient implements IApiClient {
  private cookies: CookieData[] = [];
  private headers: Record<string, string> = {};

  constructor(options?: { proxy?: string; headers?: Record<string, string> }) {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://www.xiaohongshu.com/",
      "Origin": "https://www.xiaohongshu.com",
      ...options?.headers,
    };
  }

  /**
   * # Gửi request đến XHS API (cần chữ ký X-s, X-t)
   */
  async request(_method: string, _url: string, _options?: RequestOptions): Promise<any> {
    throw new Error("Chưa triển khai: XhsClient.request");
  }

  /**
   * # Cập nhật cookies từ browser context
   */
  async updateCookies(cookies: CookieData[]): Promise<void> {
    this.cookies = cookies;
  }

  /**
   * # Lấy danh sách cookies hiện tại
   */
  getActiveCookies(): CookieData[] {
    return this.cookies;
  }
}
