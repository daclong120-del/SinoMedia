/**
 * # API client cho Zhihu (知乎)
 */

import type { IApiClient, RequestOptions, CookieData } from "../../base/base_client.js";

export class ZhihuClient implements IApiClient {
  private cookies: CookieData[] = [];
  private headers: Record<string, string> = {};

  constructor(options?: { proxy?: string; headers?: Record<string, string> }) {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://www.zhihu.com/",
      "Origin": "https://www.zhihu.com",
      ...options?.headers,
    };
  }

  async request(_method: string, _url: string, _options?: RequestOptions): Promise<any> {
    throw new Error("Chưa triển khai: ZhihuClient.request");
  }

  async updateCookies(cookies: CookieData[]): Promise<void> {
    this.cookies = cookies;
  }

  getActiveCookies(): CookieData[] {
    return this.cookies;
  }
}
