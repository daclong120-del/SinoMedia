import { launchPersistentContext } from "cloakbrowser";
import { CONFIG } from "../config.js";

/**
 * # Khởi chạy CloakBrowser để lấy cookies và msToken ban đầu của Douyin
 */
export async function bootstrapSession(profileDir: string) {
  const launchOptions: any = {
    userDataDir: profileDir,
    headless: CONFIG.headless,
    geoip: true,
    humanize: true,
  };

  if (CONFIG.proxy) {
    launchOptions.proxy = CONFIG.proxy;
  }

  const browserContext = await launchPersistentContext(launchOptions);

  try {
    const page = browserContext.pages()[0] || (await browserContext.newPage());

    console.log("Đang điều hướng tới Douyin...");
    await page.goto("https://www.douyin.com", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    console.log("Điều hướng thành công.");
    console.log("VUI LÒNG QUÉT MÃ QR HOẶC ĐĂNG NHẬP TRÊN CỬA SỔ TRÌNH DUYỆT ĐANG HIỂN THỊ.");
    console.log("Hệ thống sẽ tự động phát hiện đăng nhập thành công (chờ tối đa 120 giây)...");

    let loggedIn = false;
    for (let i = 0; i < 120; i++) {
      const cookies = await browserContext.cookies();
      const loginStatusCookie = cookies.find((c) => c.name === "LOGIN_STATUS");
      
      const hasUserLogin = await page.evaluate(() => {
        try {
          return localStorage.getItem("HasUserLogin") || localStorage.getItem("login_status");
        } catch {
          return null;
        }
      });

      if ((loginStatusCookie && loginStatusCookie.value === "1") || hasUserLogin === "1") {
        console.log("Đã phát hiện trạng thái đăng nhập thành công!");
        loggedIn = true;
        break;
      }
      
      if (i % 10 === 0 && i > 0) {
        console.log(`Đang chờ đăng nhập... (${120 - i} giây còn lại)`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!loggedIn) {
      console.log("Cảnh báo: Hết thời gian chờ đăng nhập hoặc người dùng chưa đăng nhập. Tiến hành lưu session hiện tại...");
    }

    const cookies = await browserContext.cookies();
    console.log(`Tìm thấy ${cookies.length} cookies.`);
    const msTokenCookie = cookies.find((c) => c.name === "msToken")?.value || "";
    const msTokenLocalStorage = await page.evaluate(
      () => localStorage.getItem("msToken") || localStorage.getItem("xmst") || ""
    );
    const msToken = msTokenCookie || msTokenLocalStorage || "";
    console.log(`msToken lấy được: ${msToken}`);

    return { cookies, msToken };
  } finally {
    await browserContext.close();
  }
}
