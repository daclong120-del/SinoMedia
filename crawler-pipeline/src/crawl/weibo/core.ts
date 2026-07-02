/**
 * # Crawler chính cho Weibo (微博)
 */

import type { ICrawler } from "../../base/base_crawler.js";

export class WeiboCrawler implements ICrawler {
  async start(): Promise<void> {
    throw new Error("Chưa triển khai: WeiboCrawler.start");
  }

  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: WeiboCrawler.search");
  }

  async launchBrowser(): Promise<any> {
    throw new Error("Chưa triển khai: WeiboCrawler.launchBrowser");
  }
}
