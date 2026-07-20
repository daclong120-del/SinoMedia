import { writeFile, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import readline from "node:readline";

async function main(): Promise<void> {
  const cookiesPath = "cookie.json";
  console.log("Launching Chromium for login...");
  console.log("Please log in to ChatGPT in the opened browser window.");

  // Launch headed browser with anti-detection args
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-infobars",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });

  // Inject stealth scripts to bypass webdriver detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['vi-VN', 'vi', 'en-US', 'en'],
    });
  });

  // Try loading existing cookies if they exist to keep session alive
  try {
    const raw = await readFile(cookiesPath, "utf8");
    const existing = JSON.parse(raw);
    if (Array.isArray(existing) && existing.length > 0) {
      const formatted = existing.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || "/",
        secure: c.secure ?? true,
        httpOnly: c.httpOnly ?? false,
        sameSite: c.sameSite === "no_restriction" ? "None" : (c.sameSite || "Lax"),
        ...(c.expirationDate ? { expires: c.expirationDate } : {})
      }));
      await context.addCookies(formatted);
      console.log("Loaded existing session cookies.");
    }
  } catch {}

  const page = await context.newPage();
  await page.goto("https://chatgpt.com/");

  console.log("\n=======================================================");
  console.log("Waiting for you to log in successfully...");
  console.log("Once you are logged in and see the chat screen, press [ENTER] in this terminal.");
  console.log("Alternatively, script will auto-detect login when chat box appears.");
  console.log("=======================================================\n");

  // Setup manual enter listener
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const manualConfirm = new Promise<void>((resolve) => {
    rl.question("Press Enter here when logged in...", () => {
      rl.close();
      resolve();
    });
  });

  // Setup auto detect login by polling cookies for session token
  const autoDetect = new Promise<void>((resolve) => {
    const interval = setInterval(async () => {
      try {
        const cookies = await context.cookies();
        const hasSession = cookies.some((c) => c.name === "__Secure-next-auth.session-token");
        if (hasSession) {
          console.log("\n[Auto-Detect] Logged-in session cookie detected! Saving session...");
          clearInterval(interval);
          resolve();
        }
      } catch {
        // Ignore errors during poll
      }
    }, 1500);
  });

  // Wait for either manual confirm or auto detect
  await Promise.race([manualConfirm, autoDetect]);

  console.log("\nExtracting session token from chatgpt.com...");
  const sessionPage = await context.newPage();
  try {
    await sessionPage.goto("https://chatgpt.com/api/auth/session");
    const content = await sessionPage.innerText("pre, body");
    const sessionObj = JSON.parse(content);
    if (sessionObj && sessionObj.accessToken) {
      await writeFile("session.json", JSON.stringify({ accessToken: sessionObj.accessToken }, null, 2), "utf8");
      console.log("Successfully saved accessToken to session.json!");
    } else {
      console.warn("Could not find accessToken in session payload:", content);
    }
  } catch (sessionErr) {
    console.warn("Failed to extract session token:", (sessionErr as Error).message);
  } finally {
    await sessionPage.close();
  }

  // Extract cookies
  const activeCookies = await context.cookies();
  
  // Format cookies to match the structure of cookie.json
  const formattedCookies = activeCookies.map((c) => ({
    domain: c.domain,
    expirationDate: c.expires,
    hostOnly: !c.domain.startsWith("."),
    httpOnly: c.httpOnly,
    name: c.name,
    path: c.path,
    sameSite: c.sameSite === "None" ? "no_restriction" : c.sameSite.toLowerCase(),
    secure: c.secure,
    session: c.expires === undefined,
    storeId: null,
    value: c.value
  }));

  await writeFile(cookiesPath, JSON.stringify(formattedCookies, null, 4), "utf8");
  console.log(`\nSuccessfully saved ${formattedCookies.length} cookies to ${cookiesPath}!`);
  
  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error during session save:", err);
  process.exit(1);
});
