/**
 * # Crawler chính cho Bilibili — orchestrator điều phối search, detail, creator
 */

import type { ICrawler } from "../../base/base_crawler.js";

export class BilibiliCrawler implements ICrawler {
  /**
   * # Khởi chạy crawler Bilibili
   */
  async start(): Promise<void> {
    throw new Error("Chưa triển khai: BilibiliCrawler.start");
  }

  /**
   * # Tìm kiếm video trên Bilibili theo từ khóa
   */
  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: BilibiliCrawler.search");
  }

  /**
   * # Khởi tạo browser context cho Bilibili
   */
  async launchBrowser(): Promise<any> {
    throw new Error("Chưa triển khai: BilibiliCrawler.launchBrowser");
  }
}
