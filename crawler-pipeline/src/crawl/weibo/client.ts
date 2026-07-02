/**
 * # API client cho Weibo
 */

import type { IApiClient, RequestOptions, CookieData } from "../../base/base_client.js";

export class WeiboClient implements IApiClient {
  private cookies: CookieData[] = [];
  private headers: Record<string, string> = {};

  constructor(options?: { proxy?: string; headers?: Record<string, string> }) {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://weibo.com/",
      "Origin": "https://weibo.com",
      ...options?.headers,
    };
  }

  async request(_method: string, _url: string, _options?: RequestOptions): Promise<any> {
    throw new Error("Chưa triển khai: WeiboClient.request");
  }

  async updateCookies(cookies: CookieData[]): Promise<void> {
    this.cookies = cookies;
  }

  getActiveCookies(): CookieData[] {
    return this.cookies;
  }
}
