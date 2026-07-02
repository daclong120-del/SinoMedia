import type { BrowserContext } from "playwright-core";

/**
 * # Giao diện trừu tượng cho mọi crawler platform
 * Mỗi platform (Douyin, TikTok, XHS...) phải implement interface này
 */
export interface ICrawler {
  start(): Promise<void>;
  search(keyword: string, maxCount?: number): Promise<void>;
  launchBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext>;
}

export interface BrowserLaunchOptions {
  headless?: boolean;
  proxy?: string;
  userAgent?: string;
  profileDir?: string;
}
