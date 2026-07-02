/**
 * # Crawler chính cho Kuaishou (快手)
 */

import type { ICrawler } from "../../base/base_crawler.js";

export class KuaishouCrawler implements ICrawler {
  async start(): Promise<void> {
    throw new Error("Chưa triển khai: KuaishouCrawler.start");
  }

  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: KuaishouCrawler.search");
  }

  async launchBrowser(): Promise<any> {
    throw new Error("Chưa triển khai: KuaishouCrawler.launchBrowser");
  }
}
