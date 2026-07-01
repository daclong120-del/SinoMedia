import { bootstrapSession } from "./sign/browser_sign.js";
import { saveSession } from "./sign/session_store.js";
import { crawlVideo } from "./crawl/douyin.js";
import { join } from "node:path";

/**
 * # Hàm khởi chạy chính phân tích các tham số dòng lệnh và chạy tác vụ tương ứng
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "bootstrap") {
    const profileDir = args[1] || join(process.cwd(), "output", "profiles", "douyin");
    const sessionData = await bootstrapSession(profileDir);
    await saveSession(sessionData);
    return;
  }

  if (command === "crawl") {
    const urlOrId = args[1];
    if (!urlOrId) {
      throw new Error("Vui lòng cung cấp URL hoặc ID video cần cào: npm run crawl <url_or_id>");
    }
    await crawlVideo(urlOrId);
    return;
  }

  throw new Error("Lệnh không hợp lệ. Các lệnh hỗ trợ: bootstrap, crawl <url_or_id>");
}

main().catch((err) => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});
