/**
 * # Crawler chính cho Zhihu (知乎)
 */

import type { ICrawler } from "../../base/base_crawler.js";

export class ZhihuCrawler implements ICrawler {
  async start(): Promise<void> {
    throw new Error("Chưa triển khai: ZhihuCrawler.start");
  }

  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: ZhihuCrawler.search");
  }

  async launchBrowser(): Promise<any> {
    throw new Error("Chưa triển khai: ZhihuCrawler.launchBrowser");
  }
}
