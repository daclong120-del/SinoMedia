/**
 * # Tiện ích thời gian cho crawler pipeline
 */

/**
 * # Dừng luồng trong khoảng thời gian chỉ định (milliseconds)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * # Dừng luồng ngẫu nhiên trong khoảng min-max milliseconds
 */
export function randomSleep(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(ms);
}

/**
 * # Chuyển Unix timestamp (giây) sang ISO string
 */
export function unixToIso(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * # Lấy timestamp hiện tại dạng giây
 */
export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * # Format duration từ milliseconds sang chuỗi dễ đọc
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m${remainSeconds}s`;
}
