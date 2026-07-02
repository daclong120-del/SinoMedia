import { bootstrapSession } from "./sign/browser_sign.js";
import { saveSession } from "./sign/session_store.js";
import { crawlVideo, crawlCreator, crawlSearch, crawlComments, closeBrowser } from "./crawl/douyin/index.js";
import { join } from "node:path";


/**
 * # Hàm khởi chạy chính phân tích các tham số dòng lệnh và chạy tác vụ tương ứng
 */
async function main() {
  try {
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
        const { startQueueWorker } = await import("./queue_worker.js");
        await startQueueWorker();
        return;
      }
      await crawlVideo(urlOrId);
      return;
    }

    if (command === "creator") {
      const urlOrSecUid = args[1];
      if (!urlOrSecUid) {
        throw new Error("Vui lòng cung cấp URL kênh hoặc sec_user_id cần cào: npm run creator <url_or_sec_uid>");
      }
      await crawlCreator(urlOrSecUid);
      return;
    }

    if (command === "search") {
      const keyword = args[1];
      const maxCount = args[2] ? parseInt(args[2], 10) : 20;
      if (!keyword) {
        throw new Error("Vui lòng cung cấp từ khóa tìm kiếm: npm run search <keyword> [max_count]");
      }
      await crawlSearch(keyword, maxCount);
      return;
    }

    if (command === "comments") {
      const awemeId = args[1];
      const maxCount = args[2] ? parseInt(args[2], 10) : 50;
      const withReplies = args[3] === "true" || args[3] === "1";
      if (!awemeId) {
        throw new Error("Vui lòng cung cấp aweme_id video: npm run comments <aweme_id> [max_count] [with_replies]");
      }
      await crawlComments(awemeId, { maxCount, withReplies });
      return;
    }

    throw new Error("Lệnh không hợp lệ. Các lệnh hỗ trợ: bootstrap, crawl <url_or_id>, creator <url_or_sec_uid>, search <keyword> [max_count], comments <aweme_id> [max_count] [with_replies]");
  } finally {
    await closeBrowser();
  }
}

main().catch((err) => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});
