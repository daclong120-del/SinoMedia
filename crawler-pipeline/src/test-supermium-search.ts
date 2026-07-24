import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { join } from "node:path";

(async () => {
  const supermiumPath = process.env.SUPERMIUM_PATH || "C:\\Program Files\\Supermium\\chrome.exe";
  console.log(`[Test Supermium Search] Checking path: ${supermiumPath}`);

  if (!existsSync(supermiumPath)) {
    console.error(`❌ File thực thi Supermium không tồn tại tại: ${supermiumPath}`);
    process.exit(1);
  }

  const profileDir = join(process.cwd(), "output", "browser-profiles", "supermium-test");
  console.log(`🚀 Khởi chạy Supermium Persistent Context...`);

  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      executablePath: supermiumPath,
      headless: true,
      viewport: { width: 1280, height: 800 },
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials"
      ]
    });

    const page = context.pages()[0] || await context.newPage();

    console.log(`🌐 Đang mở DuckDuckGo HTML...`);
    await page.goto("https://html.duckduckgo.com/html/", { waitUntil: "domcontentloaded", timeout: 25000 });

    console.log(`⌨️ Nhập 'hello' vào thanh tìm kiếm...`);
    const searchInputSelector = "input[name='q']";
    await page.waitForSelector(searchInputSelector, { timeout: 10000 });
    await page.fill(searchInputSelector, "hello");

    console.log(`🔍 Submit từ khóa 'hello'...`);
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});

    const title = await page.title();
    console.log(`📄 Tiêu đề trang kết quả: "${title}"`);

    const screenshotPath = join(process.cwd(), "..", "scratch", "supermium_search_hello.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Đã chụp ảnh màn hình kết quả tại: ${screenshotPath}`);

    await context.close();
    console.log(`🎉 Test tìm kiếm 'hello' bằng Supermium thành công!`);
  } catch (err: any) {
    console.error(`❌ Lỗi trong quá trình chạy Supermium search:`, err.message || err);
    process.exit(1);
  }
})();
