/**
 * # Crawler chính cho XHS (小红书)
 */

import type { ICrawler } from "../../base/base_crawler.js";

export class XhsCrawler implements ICrawler {
  /**
   * # Khởi chạy crawler XHS
   */
  async start(): Promise<void> {
    throw new Error("Chưa triển khai: XhsCrawler.start");
  }

  /**
   * # Tìm kiếm note trên XHS theo từ khóa
   */
  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: XhsCrawler.search");
  }

  /**
   * # Khởi tạo browser context cho XHS
   */
  async launchBrowser(): Promise<any> {
    throw new Error("Chưa triển khai: XhsCrawler.launchBrowser");
  }
}
