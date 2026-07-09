import { CONFIG } from "./config.js";
import { supabaseRest } from "./store/supabase_client.js";
import { logger, redactSecrets } from "./utils/index.js";
import { closeBrowser } from "./crawl/douyin/index.js";
import { PlatformType } from "./constant/index.js";
import { CrawlerTask } from "./model/index.js";
import { CrawlerFactory } from "./crawl/crawler_factory.js";

// Trạng thái task hiện tại để ghi log vào DB
let currentTaskId: string | null = null;

/**
 * # Ghi log của task hiện tại vào bảng crawler_logs trong Supabase
 */
async function writeLogToDb(level: string, message: string) {
  if (!currentTaskId) return;
  try {
    await supabaseRest("crawler_logs", {
      method: "POST",
      body: {
        task_id: currentTaskId,
        level,
        message,
      },
      headers: {
        "Prefer": "return=minimal",
      },
    });
  } catch (err: any) {
    console.error(`[Worker] Không thể ghi log vào DB: ${err.message}`);
  }
}

// Ghi đè logger mặc định để tự động đẩy log lên Supabase khi đang chạy task
const originalInfo = logger.info;
const originalWarn = logger.warn;
const originalError = logger.error;
const originalDebug = logger.debug;

logger.info = (msg: string, tag?: string) => {
  const redacted = redactSecrets(msg);
  originalInfo(redacted, tag);
  if (currentTaskId) writeLogToDb("info", `[${tag || "Crawler"}] ${redacted}`);
};
logger.warn = (msg: string, tag?: string) => {
  const redacted = redactSecrets(msg);
  originalWarn(redacted, tag);
  if (currentTaskId) writeLogToDb("warn", `[${tag || "Crawler"}] ${redacted}`);
};
logger.error = (msg: string, tag?: string) => {
  const redacted = redactSecrets(msg);
  originalError(redacted, tag);
  if (currentTaskId) writeLogToDb("error", `[${tag || "Crawler"}] ${redacted}`);
};
logger.debug = (msg: string, tag?: string) => {
  const redacted = redactSecrets(msg);
  originalDebug(redacted, tag);
  if (currentTaskId) writeLogToDb("debug", `[${tag || "Crawler"}] ${redacted}`);
};

/**
 * # Lấy và claim nguyên tử 1 task từ database
 */
async function claimNextTask(): Promise<CrawlerTask | null> {
  try {
    const task = await supabaseRest("rpc/claim_next_crawler_task", {
      method: "POST",
    });
    return task as CrawlerTask | null;
  } catch (err: any) {
    logger.error(`Lỗi khi claim task từ Supabase: ${err.message}`, "Worker");
    return null;
  }
}

/**
 * # Cập nhật trạng thái của task
 */
async function updateTaskStatus(taskId: string, status: "completed" | "failed", errorMessage?: string): Promise<void> {
  try {
    await supabaseRest("crawler_tasks", {
      method: "PATCH",
      params: { id: `eq.${taskId}` },
      body: {
        status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error(`Lỗi khi cập nhật trạng thái task ${taskId}: ${err.message}`, "Worker");
  }
}

/**
 * # Thực thi 1 task cụ thể dựa trên platform và command
 */
export async function executeTask(task: CrawlerTask): Promise<void> {
  const { id, platform, command, target, max_count } = task;
  if (!id) return;
  currentTaskId = id;

  logger.info(`Bắt đầu xử lý task ${id} - Platform: ${platform}, Command: ${command}, Target: ${target}`, "Worker");

  const defaultHeadless = CONFIG.headless;

  // Cấu hình timeout động dựa trên workload
  // Mỗi video/bài đăng tìm kiếm/creator: 5 giây
  // Nếu bật cào bình luận, cộng thêm 25 giây cho mỗi video (bao gồm cả sub-comments)
  const maxCount = max_count || (command === "comments" ? 50 : 20);
  const crawlCommentsEnabled = task.metadata?.crawl_comments !== false;
  const crawlSubCommentsEnabled = task.metadata?.crawl_sub_comments !== false;

  let calculatedTimeoutMs = 90000; // Tối thiểu 90s cho setup/login/search
  if (command === "search" || command === "creator") {
    calculatedTimeoutMs += maxCount * 5000;
    if (crawlCommentsEnabled) {
      const commentTime = crawlSubCommentsEnabled ? 30000 : 15000;
      calculatedTimeoutMs += maxCount * commentTime;
    }
  } else if (command === "comments") {
    calculatedTimeoutMs += maxCount * (crawlSubCommentsEnabled ? 10000 : 5000);
  }

  const TASK_TIMEOUT_MS = Math.min(1800000, calculatedTimeoutMs); // Cap ở 30 phút
  logger.info(`Thời gian timeout được thiết lập động: ${TASK_TIMEOUT_MS / 1000} giây (khoảng ${(TASK_TIMEOUT_MS / 60000).toFixed(1)} phút)`, "Worker");

  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<void>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Nhiệm vụ bị treo quá thời gian cho phép (Timeout ${TASK_TIMEOUT_MS / 1000} giây)`));
    }, TASK_TIMEOUT_MS);
  });

  try {
    // Thiết lập cấu hình và metadata chạy crawler từ task
    process.env.CURRENT_TASK_ID = id;
    process.env.CURRENT_TASK_TAGS = JSON.stringify(task.metadata?.tags || []);
    process.env.CURRENT_TASK_LANGUAGE = task.metadata?.language || "auto";
    process.env.ENABLE_GET_COMMENTS = String(task.metadata?.crawl_comments ?? true);
    process.env.ENABLE_GET_SUB_COMMENTS = String(task.metadata?.crawl_sub_comments ?? true);
    CONFIG.headless = task.metadata?.headless ?? true;

    const crawler = CrawlerFactory.create(platform);

    const runCrawler = async () => {
      switch (command) {
        case "crawl":
          await crawler.crawl(target);
          break;
        case "cache_media":
          throw new Error("Lệnh 'cache_media' đã bị bãi bỏ (deprecated). Vui lòng recrawl/backfill thông thường.");
        case "creator":
          await crawler.creator(target, max_count);
          break;
        case "search":
          await crawler.search(target, max_count || 20);
          break;
        case "comments":
          await crawler.comments(target, max_count || 50);
          break;
        default:
          throw new Error(`Lệnh "${command}" không được hỗ trợ.`);
      }
    };

    await Promise.race([
      runCrawler(),
      timeoutPromise
    ]);

    logger.info(`Hoàn thành task ${id} thành công!`, "Worker");
    await updateTaskStatus(id, "completed");
  } catch (err: any) {
    logger.error(`Thất bại khi xử lý task ${id}: ${err.message}`, "Worker");
    
    let displayError = err.message;
    try {
      const res = await supabaseRest("crawler_tasks", {
        method: "GET",
        params: { id: `eq.${id}`, select: "metadata" },
      }) as any[];
      if (res && res[0] && res[0].metadata?.progress) {
        const { current, target } = res[0].metadata.progress;
        if (err.message.includes("Nhiệm vụ bị treo quá thời gian")) {
          displayError = `Timeout sau ${(TASK_TIMEOUT_MS / 1000).toFixed(0)}s, đã lưu ${current}/${target}`;
        } else {
          displayError = `${err.message} (đã lưu ${current}/${target})`;
        }
      } else if (err.message.includes("Nhiệm vụ bị treo quá thời gian")) {
        const target = max_count || (command === "comments" ? 50 : 20);
        displayError = `Timeout sau ${(TASK_TIMEOUT_MS / 1000).toFixed(0)}s, đã lưu 0/${target}`;
      }
    } catch (progressErr) {
      // Bỏ qua nếu lỗi
    }

    await updateTaskStatus(id, "failed", displayError);
    if (err.message.includes("Nhiệm vụ bị treo quá thời gian")) {
      logger.warn("Tự động thoát process để dọn sạch tài nguyên và restart worker mới...", "Worker");
      setTimeout(() => process.exit(1), 1000);
    }
  } finally {
    clearTimeout(timeoutId!);
    currentTaskId = null;
    delete process.env.CURRENT_TASK_ID;
    delete process.env.CURRENT_TASK_TAGS;
    delete process.env.CURRENT_TASK_LANGUAGE;
    delete process.env.ENABLE_GET_COMMENTS;
    delete process.env.ENABLE_GET_SUB_COMMENTS;
    CONFIG.headless = defaultHeadless;
    await closeBrowser().catch(() => { });
  }
}

/**
 * # Vòng lặp chính của Queue Worker
 */
export async function startQueueWorker(): Promise<void> {
  logger.info("Khởi chạy Crawler Queue Worker... Đang lắng nghe task từ Supabase...", "Worker");

  while (true) {
    const task = await claimNextTask();
    if (task) {
      await executeTask(task);
    }
    // Dừng 5 giây trước khi check task tiếp theo (Polling)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
