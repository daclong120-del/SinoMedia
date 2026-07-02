/**
 * # Crawler chính cho XHS (小红书)
 */

import type { ICrawler, BrowserLaunchOptions } from "../../base/base_crawler.js";
import type { BrowserContext } from "playwright-core";

export class XhsCrawler implements ICrawler {
  /**
   * # Thực hiện cào chi tiết bài đăng (note) trên XHS
   */
  async crawl(_target: string): Promise<void> {
    throw new Error("Chưa triển khai: XhsCrawler.crawl");
  }

  /**
   * # Thực hiện cào profile creator và bài đăng của họ trên XHS
   */
  async creator(_target: string): Promise<void> {
    throw new Error("Chưa triển khai: XhsCrawler.creator");
  }

  /**
   * # Tìm kiếm note trên XHS theo từ khóa
   */
  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: XhsCrawler.search");
  }

  /**
   * # Cào bình luận của note trên XHS
   */
  async comments(_target: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: XhsCrawler.comments");
  }

  /**
   * # Khởi tạo browser context cho XHS
   */
  async launchBrowser(_options?: BrowserLaunchOptions): Promise<BrowserContext> {
    throw new Error("Chưa triển khai: XhsCrawler.launchBrowser");
  }
}
