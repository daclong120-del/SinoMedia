/**
 * # Logger tập trung cho crawler pipeline
 * Ánh xạ từ ChinaMediaCrawler tools/utils.py init_loging_config()
 * Dùng console native — không cần thư viện logging bên ngoài
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function formatMsg(level: string, tag: string, msg: string): string {
  return `${timestamp()} [${level.toUpperCase()}] (${tag}) ${msg}`;
}

export const logger = {
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  debug(msg: string, tag = "Crawler"): void {
    if (LOG_LEVELS.debug >= LOG_LEVELS[currentLevel]) {
      console.debug(formatMsg("debug", tag, msg));
    }
  },

  info(msg: string, tag = "Crawler"): void {
    if (LOG_LEVELS.info >= LOG_LEVELS[currentLevel]) {
      console.info(formatMsg("info", tag, msg));
    }
  },

  warn(msg: string, tag = "Crawler"): void {
    if (LOG_LEVELS.warn >= LOG_LEVELS[currentLevel]) {
      console.warn(formatMsg("warn", tag, msg));
    }
  },

  error(msg: string, tag = "Crawler"): void {
    if (LOG_LEVELS.error >= LOG_LEVELS[currentLevel]) {
      console.error(formatMsg("error", tag, msg));
    }
  },
};
