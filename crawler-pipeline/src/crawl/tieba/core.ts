/**
 * # Crawler chính cho Tieba (百度贴吧)
 */

import type { ICrawler } from "../../base/base_crawler.js";

export class TiebaCrawler implements ICrawler {
  async start(): Promise<void> {
    throw new Error("Chưa triển khai: TiebaCrawler.start");
  }

  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: TiebaCrawler.search");
  }

  async launchBrowser(): Promise<any> {
    throw new Error("Chưa triển khai: TiebaCrawler.launchBrowser");
  }
}
