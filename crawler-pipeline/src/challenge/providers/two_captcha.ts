import { ICaptchaSolver, SliderCaptchaTask, TurnstileCaptchaTask, CaptchaSolution } from "../types.js";

/**
 * # Provider giải CAPTCHA tự động qua dịch vụ 2Captcha API
 */
export class TwoCaptchaProvider implements ICaptchaSolver {
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(apiKey: string, timeoutMs = 120000) {
    if (!apiKey) {
      throw new Error("2Captcha API key is missing. Please set TWOCAPTCHA_API_KEY in .env");
    }
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  /**
   * # Lấy số dư tài khoản 2Captcha hiện tại ($ USD)
   */
  async getBalance(): Promise<number> {
    const url = `https://2captcha.com/res.php?key=${this.apiKey}&action=getbalance&json=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 1) {
      return parseFloat(data.request);
    }
    throw new Error(`2Captcha getBalance failed: ${data.request}`);
  }

  /**
   * # Giải Captcha Slider (Cắt ghép hình ảnh lấy tọa độ xOffset)
   */
  async solveSlider(task: SliderCaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();
    console.log("[2Captcha] Gửi ảnh Captcha Slider lên 2Captcha solver server...");

    // Submit task
    const params = new URLSearchParams();
    params.append("key", this.apiKey);
    params.append("method", "base64");
    params.append("body", task.backgroundImageBase64);
    if (task.pieceImageBase64) {
      params.append("imgfiles", task.pieceImageBase64);
    }
    params.append("coordinatescaptcha", "1");
    params.append("json", "1");

    const submitRes = await fetch("https://2captcha.com/in.php", {
      method: "POST",
      body: params,
    });
    const submitData = await submitRes.json();

    if (submitData.status !== 1) {
      throw new Error(`2Captcha task submit error: ${submitData.request}`);
    }

    const captchaId = submitData.request;
    console.log(`[2Captcha] Task đã tạo thành công, Captcha ID: ${captchaId}. Đang chờ giải...`);

    // Poll for result
    const pollInterval = 3000;
    const maxPolls = Math.floor(this.timeoutMs / pollInterval);

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      const resUrl = `https://2captcha.com/res.php?key=${this.apiKey}&action=get&id=${captchaId}&json=1`;
      const resultRes = await fetch(resUrl);
      const resultData = await resultRes.json();

      if (resultData.status === 1) {
        // Result format: "x=120,y=45" or raw text
        const solutionText = resultData.request;
        console.log(`[2Captcha] Nhận được kết quả thành công: ${solutionText}`);
        
        let xOffset = 0;
        const xMatch = solutionText.match(/x=(\d+)/i);
        if (xMatch) {
          xOffset = parseInt(xMatch[1], 10);
        } else if (/^\d+$/.test(solutionText.trim())) {
          xOffset = parseInt(solutionText.trim(), 10);
        }

        return {
          xOffset,
          text: solutionText,
          solveTimeMs: Date.now() - startTime,
        };
      }

      if (resultData.request !== "CAPCHA_NOT_READY") {
        throw new Error(`2Captcha solver error: ${resultData.request}`);
      }
    }

    throw new Error(`2Captcha timeout sau ${this.timeoutMs / 1000}s chờ kết quả giải.`);
  }

  /**
   * # Giải Cloudflare Turnstile / HCaptcha
   */
  async solveTurnstile(task: TurnstileCaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();
    console.log(`[2Captcha] Gửi Turnstile sitekey ${task.siteKey} lên 2Captcha solver...`);

    const submitUrl = `https://2captcha.com/in.php?key=${this.apiKey}&method=turnstile&sitekey=${encodeURIComponent(task.siteKey)}&pageurl=${encodeURIComponent(task.pageUrl)}&json=1`;
    const submitRes = await fetch(submitUrl);
    const submitData = await submitRes.json();

    if (submitData.status !== 1) {
      throw new Error(`2Captcha Turnstile submit error: ${submitData.request}`);
    }

    const captchaId = submitData.request;
    const pollInterval = 5000;
    const maxPolls = Math.floor(this.timeoutMs / pollInterval);

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      const resUrl = `https://2captcha.com/res.php?key=${this.apiKey}&action=get&id=${captchaId}&json=1`;
      const resultRes = await fetch(resUrl);
      const resultData = await resultRes.json();

      if (resultData.status === 1) {
        return {
          token: resultData.request,
          solveTimeMs: Date.now() - startTime,
        };
      }

      if (resultData.request !== "CAPCHA_NOT_READY") {
        throw new Error(`2Captcha Turnstile solver error: ${resultData.request}`);
      }
    }

    throw new Error(`2Captcha Turnstile timeout sau ${this.timeoutMs / 1000}s.`);
  }
}
