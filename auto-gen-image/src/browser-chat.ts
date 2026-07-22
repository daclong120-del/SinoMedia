import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

interface BrowserCookie {
  domain: string;
  name: string;
  value: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expirationDate?: number;
  sameSite?: string;
}

interface CliOptions {
  message: string;
  cookiesFile: string;
  headed: boolean;
  timeoutMs: number;
  continueLatest?: boolean;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  console.log(`Starting browser automation for chatgpt.com...`);
  console.log(`Message: "${options.message}"`);
  console.log(`Cookies source: ${options.cookiesFile}`);

  // 1. Launch browser with anti-detection args
  const browser = await chromium.launch({
    headless: !options.headed,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-infobars",
    ],
  });

  try {
    // 2. Load cookies
    let rawCookies: BrowserCookie[] = [];
    try {
      const content = await readFile(options.cookiesFile, "utf8");
      rawCookies = JSON.parse(content) as BrowserCookie[];
    } catch (err) {
      console.warn(`Could not read cookies file: ${(err as Error).message}`);
    }

    // 3. Create context & apply cookies
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

    if (rawCookies.length > 0) {
      const formattedCookies = rawCookies.map((c) => {
        let sameSite: "Lax" | "Strict" | "None" = "Lax";
        if (c.sameSite === "no_restriction" || c.sameSite === "None") {
          sameSite = "None";
        } else if (c.sameSite === "strict" || c.sameSite === "Strict") {
          sameSite = "Strict";
        }

        return {
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path || "/",
          secure: c.secure ?? true,
          httpOnly: c.httpOnly ?? false,
          sameSite,
          ...(c.expirationDate ? { expires: c.expirationDate } : {}),
        };
      });
      await context.addCookies(formattedCookies);
      console.log(`Loaded ${rawCookies.length} cookies into browser context.`);
    }

    // 4. Open page & navigate
    const page = await context.newPage();
    console.log("Navigating to https://chatgpt.com/ ...");
    await page.goto("https://chatgpt.com/", { timeout: options.timeoutMs });

    // Wait a bit for page to stabilize
    await page.waitForTimeout(3000);

    // 5. Check if we need to handle login or bypass
    let textarea = page.locator("#prompt-textarea");
    try {
      await textarea.waitFor({ state: "visible", timeout: 15000 });
      console.log("Successfully bypassed login screen using cookies!");
    } catch {
      console.log("Could not find prompt-textarea. Cookies might be expired or invalid.");
      console.log("Saving screenshot to debug...");
      await page.screenshot({ path: "responses/debug-login.png" });
      throw new Error("Unable to access chat screen (possibly unauthorized). Check responses/debug-login.png.");
    }

    // Handle continuing the latest conversation if requested
    if (options.continueLatest) {
      console.log("Attempting to continue the latest conversation from sidebar...");
      const latestChatLink = page.locator('a[href^="/c/"]').first();
      try {
        await latestChatLink.waitFor({ state: "visible", timeout: 10000 });
        const chatTitle = await latestChatLink.innerText();
        console.log(`Resuming conversation: "${chatTitle.trim().replace(/\n/g, ' ')}"`);
        await latestChatLink.click();
        
        // Wait for page to transition to the conversation URL and prompt area to stabilize
        await page.waitForTimeout(4000);
        // Relocate textarea on the new conversation page
        textarea = page.locator("#prompt-textarea");
        await textarea.waitFor({ state: "visible", timeout: 10000 });
      } catch (err) {
        console.warn("Could not find any recent conversation in sidebar to continue. Starting a new chat instead.");
      }
    }

    // 6. Type and send message
    console.log(`Typing message: "${options.message}"...`);
    await textarea.fill(options.message);
    await page.waitForTimeout(1000);
    
    console.log("Clicking Send button...");
    const sendButton = page.locator('button[data-testid="send-button"]');
    await sendButton.click();

    // Wait for the response generation to start and then finish
    console.log("Waiting for ChatGPT to reply...");
    const stopButton = page.locator('button[data-testid="stop-button"]');
    try {
      // Wait for stop-button to appear (generation started)
      await stopButton.waitFor({ state: "visible", timeout: 8000 });
      console.log("ChatGPT is typing...");
      // Wait for stop-button to disappear (generation finished)
      await stopButton.waitFor({ state: "hidden", timeout: options.timeoutMs });
    } catch {
      // Fallback if generation was super fast and stop button wasn't caught
      await page.waitForTimeout(6000);
    }

    // Wait a brief moment to ensure all image assets and DOM chunks are fully rendered
    await page.waitForTimeout(3000);

    // 7. Extract the response (text and images)
    let text = "";
    let imageUrls: string[] = [];

    // Try to get markdown text from the last block
    const markdown = page.locator(".markdown");
    const count = await markdown.count();
    if (count > 0) {
      text = await markdown.nth(count - 1).innerText();
    }

    // Try to find the last generated image on the page (scanning bottom-up)
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = imageCount - 1; i >= 0; i--) {
      const img = images.nth(i);
      const src = await img.getAttribute("src");
      if (src && (src.includes("oaiusercontent.com") || src.startsWith("blob:") || src.startsWith("http"))) {
        // Avoid profile avatars, small icons or static assets
        if (!src.includes("profile") && !src.includes("avatar") && !src.includes("oaistatic.com")) {
          imageUrls.push(src);
          break; // Only extract the latest generated image
        }
      }
    }

    if (!text && imageUrls.length === 0) {
      throw new Error("No text response or generated image found in the last turn.");
    }

    // Download images if found
    if (imageUrls.length > 0) {
      console.log(`Found ${imageUrls.length} generated image(s) in the response.`);
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        try {
          console.log(`Downloading generated image ${i + 1} from browser context...`);
          let buffer: Buffer;
          if (url.startsWith("blob:")) {
            const base64Data = await page.evaluate(async (imgUrl) => {
              const res = await fetch(imgUrl);
              const blob = await res.blob();
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }, url);
            buffer = Buffer.from(base64Data.split(",")[1], "base64");
          } else {
            const imgResponse = await context.request.get(url);
            buffer = await imgResponse.body();
          }

          const imagePath = path.join("responses", `generated-image-${Date.now()}-${i + 1}.png`);
          await writeFile(imagePath, buffer);
          console.log(`Successfully saved generated image to: ${imagePath}`);
        } catch (downloadErr) {
          console.warn(`Failed to download image ${i + 1}:`, (downloadErr as Error).message);
        }
      }
    }

    console.log("\n=================== CHATGPT RESPONSE ===================");
    console.log(text);
    console.log("========================================================\n");

    // Save output
    const outPath = path.join("responses", `browser-chat-${Date.now()}.txt`);
    await page.screenshot({ path: `responses/browser-chat-success-${Date.now()}.png` });
    console.log(`Saved screenshot to responses/`);

  } catch (err) {
    console.error(`Execution error: ${(err as Error).message}`);
    try {
      const errorScreenshotPath = `responses/error-screenshot-${Date.now()}.png`;
      const pages = browser.contexts()[0]?.pages() || [];
      if (pages.length > 0) {
        await pages[0].screenshot({ path: errorScreenshotPath });
        console.log(`Saved error screenshot to: ${errorScreenshotPath}`);
      }
    } catch (screenshotErr) {
      console.error(`Failed to save error screenshot: ${(screenshotErr as Error).message}`);
    }
    throw err;
  } finally {
    await browser.close();
  }
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    message: "hello",
    cookiesFile: "cookie.json",
    headed: false,
    timeoutMs: 120000,
    continueLatest: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const readValue = (): string => {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case "--message":
      case "-m":
        options.message = readValue();
        break;
      case "--cookies":
        options.cookiesFile = readValue();
        break;
      case "--headed":
        options.headed = true;
        break;
      case "--continue":
        options.continueLatest = true;
        break;
      case "--timeout":
        options.timeoutMs = Number(readValue());
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

main().catch((err) => {
  console.error(`Error: ${(err as Error).message}`);
  process.exitCode = 1;
});
