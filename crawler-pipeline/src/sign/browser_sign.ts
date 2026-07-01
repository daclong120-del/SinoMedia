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

    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    console.log("Đang điều hướng tới Douyin...");
    await page.goto("https://www.douyin.com", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    console.log("Điều hướng thành công. Đang chờ 5 giây...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

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
