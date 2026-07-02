/**
 * # Tiện ích quản lý browser context — tách logic browser khỏi client.ts
 */

export interface BrowserContextOptions {
  profileDir: string;
  headless: boolean;
  proxy?: string;
  geoip?: boolean;
  humanize?: boolean;
  blockResources?: string[];
}

const DEFAULT_BLOCKED_RESOURCES = ["image", "media", "font", "stylesheet"];

/**
 * # Tạo options cho route chặn tài nguyên không cần thiết (tiết kiệm RAM)
 */
export function getBlockedResourceTypes(custom?: string[]): string[] {
  return custom || DEFAULT_BLOCKED_RESOURCES;
}

/**
 * # Tính toán có nên recycle browser dựa trên số trang đã tải
 */
export function shouldRecycleBrowser(pageLoadCount: number, threshold: number = 50): boolean {
  return pageLoadCount >= threshold;
}

/**
 * # Trích xuất thông tin Chrome version từ User-Agent string
 */
export function extractChromeVersion(userAgent: string): { full: string; major: string } {
  const match = userAgent.match(/Chrome\/([\d.]+)/);
  const full = match ? match[1] : "120.0.0.0";
  const major = full.split(".")[0];
  return { full, major };
}
