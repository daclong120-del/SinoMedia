/**
 * # API client cho Bilibili — gửi HTTP request đến Bilibili API
 */

import type { IApiClient, RequestOptions, CookieData } from "../../base/base_client.js";

export class BilibiliClient implements IApiClient {
  private cookies: CookieData[] = [];
  private headers: Record<string, string> = {};

  constructor(options?: { proxy?: string; headers?: Record<string, string> }) {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://www.bilibili.com/",
      "Origin": "https://www.bilibili.com",
      ...options?.headers,
    };
  }

  /**
   * # Gửi request đến Bilibili API
   */
  async request(_method: string, _url: string, _options?: RequestOptions): Promise<any> {
    throw new Error("Chưa triển khai: BilibiliClient.request");
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
