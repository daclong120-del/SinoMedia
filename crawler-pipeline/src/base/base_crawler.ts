import type { BrowserContext } from "playwright-core";

/**
 * # Giao diện trừu tượng cho mọi crawler platform
 * Mỗi platform (Douyin, TikTok, XHS...) phải implement interface này
 */
export interface ICrawler {
  /**
   * # Cào chi tiết một video/bài đăng
   */
  crawl(target: string): Promise<void>;

  /**
   * # Cào thông tin người sáng tạo nội dung (creator) và danh sách bài đăng của họ
   */
  creator(target: string): Promise<void>;

  /**
   * # Tìm kiếm bài viết/video theo từ khóa
   */
  search(keyword: string, maxCount?: number): Promise<void>;

  /**
   * # Cào danh sách bình luận của bài viết/video
   */
  comments(target: string, maxCount?: number): Promise<void>;

  /**
   * # Khởi tạo browser context cho platform tương ứng
   */
  launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext>;
}

export interface BrowserLaunchOptions {
  headless?: boolean;
  proxy?: string;
  userAgent?: string;
  profileDir?: string;
}

