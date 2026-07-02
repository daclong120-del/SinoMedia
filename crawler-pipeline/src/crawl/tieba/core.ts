/**
 * # Crawler chính cho Tieba (百度贴吧)
 */

import type { ICrawler, BrowserLaunchOptions } from "../../base/base_crawler.js";
import type { BrowserContext } from "playwright-core";

export class TiebaCrawler implements ICrawler {
  /**
   * # Thực hiện cào chi tiết bài đăng Tieba
   */
  async crawl(_target: string): Promise<void> {
    throw new Error("Chưa triển khai: TiebaCrawler.crawl");
  }

  /**
   * # Thực hiện cào profile creator và danh sách bài đăng của họ trên Tieba
   */
  async creator(_target: string): Promise<void> {
    throw new Error("Chưa triển khai: TiebaCrawler.creator");
  }

  /**
   * # Tìm kiếm bài đăng Tieba theo từ khóa
   */
  async search(_keyword: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: TiebaCrawler.search");
  }

  /**
   * # Cào bình luận của bài đăng Tieba
   */
  async comments(_target: string, _maxCount?: number): Promise<void> {
    throw new Error("Chưa triển khai: TiebaCrawler.comments");
  }

  /**
   * # Khởi chạy trình duyệt cho Tieba
   */
  async launchBrowser(_options?: BrowserLaunchOptions): Promise<BrowserContext> {
    throw new Error("Chưa triển khai: TiebaCrawler.launchBrowser");
  }
}
