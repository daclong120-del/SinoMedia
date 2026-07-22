/**
 * # Interfaces & Types cho lớp Giải CAPTCHA / Anti-Bot Challenge
 */

export type CaptchaProviderType = "2captcha" | "manual";

export interface CaptchaSolution {
  code?: string;
  xOffset?: number;
  token?: string;
  text?: string;
  solveTimeMs?: number;
}

export interface SliderCaptchaTask {
  type: "slider";
  backgroundImageBase64: string;
  pieceImageBase64?: string;
  pageUrl?: string;
}

export interface TurnstileCaptchaTask {
  type: "turnstile";
  siteKey: string;
  pageUrl: string;
}

export type CaptchaTask = SliderCaptchaTask | TurnstileCaptchaTask;

export interface ICaptchaSolver {
  solveSlider(task: SliderCaptchaTask): Promise<CaptchaSolution>;
  solveTurnstile(task: TurnstileCaptchaTask): Promise<CaptchaSolution>;
  getBalance(): Promise<number>;
}

export interface SolverConfig {
  provider: CaptchaProviderType;
  apiKey?: string;
  timeoutMs?: number;
  maxAttempts?: number;
}
