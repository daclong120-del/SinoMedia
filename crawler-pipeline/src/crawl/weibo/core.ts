/**
 * # Crawler chính cho Weibo (微博)
 */

import type { ICrawler, BrowserLaunchOptions } from "../../base/base_crawler.js";
import type { BrowserContext } from "playwright-core";

export class WeiboCrawler implements ICrawler {
  /**
   * # Thực hiện cào chi tiết bài đăng Weibo
   */
  async crawl(_target: string): Promise<void> {
    throw new Error("Chưa triển khai: WeiboCrawler.crawl");
  }

  /**
   * # Thực hiện cào profile creator và bài đăng của họ trên Weibo
   */
  async creator(_target: string): Promise<void> {
    throw new Error("Chưa triển khai: WeiboCrawler.creator");
  }

  /**
   * # Tìm kiếm bài đăng Weibo theo từ khóa
   */
  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: WeiboCrawler.search");
  }

  /**
   * # Cào bình luận của bài đăng Weibo
   */
  async comments(_target: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: WeiboCrawler.comments");
  }

  /**
   * # Khởi chạy trình duyệt cho Weibo
   */
  async launchBrowser(_options?: BrowserLaunchOptions): Promise<BrowserContext> {
    throw new Error("Chưa triển khai: WeiboCrawler.launchBrowser");
  }
}
