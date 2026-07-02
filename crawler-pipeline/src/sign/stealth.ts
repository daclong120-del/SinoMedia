/**
 * # Tiện ích Stealth — cung cấp khả năng anti-detect cho Playwright
 * Sử dụng puppeteer-extra-plugin-stealth thông qua playwright-extra
 * Dùng cho các platform cần raw Playwright (không qua cloakbrowser)
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const stealthPlugin = StealthPlugin();
chromium.use(stealthPlugin);

/**
 * # Export chromium instance đã được trang bị stealth plugin
 */
export { chromium as stealthChromium };

/**
 * # Khởi chạy persistent context với stealth đã kích hoạt
 */
export async function launchStealthContext(options: {
  userDataDir: string;
  headless?: boolean;
  proxy?: { server: string };
}) {
  return chromium.launchPersistentContext(options.userDataDir, {
    headless: options.headless ?? true,
    proxy: options.proxy,
  });
}
