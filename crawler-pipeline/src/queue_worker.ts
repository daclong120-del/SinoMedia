import { CONFIG } from "./config.js";
import { supabaseRest } from "./store/supabase_client.js";
import { logger } from "./utils/index.js";
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
  originalInfo(msg, tag);
  if (currentTaskId) writeLogToDb("info", `[${tag || "Crawler"}] ${msg}`);
};
logger.warn = (msg: string, tag?: string) => {
  originalWarn(msg, tag);
  if (currentTaskId) writeLogToDb("warn", `[${tag || "Crawler"}] ${msg}`);
};
logger.error = (msg: string, tag?: string) => {
  originalError(msg, tag);
  if (currentTaskId) writeLogToDb("error", `[${tag || "Crawler"}] ${msg}`);
};
logger.debug = (msg: string, tag?: string) => {
  originalDebug(msg, tag);
  if (currentTaskId) writeLogToDb("debug", `[${tag || "Crawler"}] ${msg}`);
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
async function executeTask(task: CrawlerTask): Promise<void> {
  const { id, platform, command, target, max_count } = task;
  if (!id) return;
  currentTaskId = id;

  logger.info(`Bắt đầu xử lý task ${id} - Platform: ${platform}, Command: ${command}, Target: ${target}`, "Worker");

  const defaultHeadless = CONFIG.headless;

  try {
    // Thiết lập cấu hình và metadata chạy crawler từ task
    process.env.CURRENT_TASK_TAGS = JSON.stringify(task.metadata?.tags || []);
    process.env.CURRENT_TASK_LANGUAGE = task.metadata?.language || "auto";
    process.env.ENABLE_GET_COMMENTS = String(task.metadata?.crawl_comments ?? true);
    process.env.ENABLE_GET_SUB_COMMENTS = String(task.metadata?.crawl_sub_comments ?? true);
    process.env.ENABLE_UPLOAD_R2 = String(task.metadata?.upload_r2 ?? true);
    CONFIG.headless = task.metadata?.headless ?? true;

    const crawler = CrawlerFactory.create(platform);

    switch (command) {
      case "crawl":
        await crawler.crawl(target);
        break;
      case "creator":
        await crawler.creator(target);
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

    logger.info(`Hoàn thành task ${id} thành công!`, "Worker");
    await updateTaskStatus(id, "completed");
  } catch (err: any) {
    logger.error(`Thất bại khi xử lý task ${id}: ${err.message}`, "Worker");
    await updateTaskStatus(id, "failed", err.message);
  } finally {
    currentTaskId = null;
    delete process.env.CURRENT_TASK_TAGS;
    delete process.env.CURRENT_TASK_LANGUAGE;
    delete process.env.ENABLE_GET_COMMENTS;
    delete process.env.ENABLE_GET_SUB_COMMENTS;
    delete process.env.ENABLE_UPLOAD_R2;
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
