/**
 * # Queue Worker xử lý tác vụ cào dữ liệu từ database Supabase
 * Thay thế cho FastAPI API routers của ChinaMediaCrawler bằng kiến trúc hướng DB (Database-driven)
 */

import { CONFIG } from "./config.js";
import { logger } from "./utils/index.js";
import { closeBrowser } from "./crawl/douyin/index.js";
import { PlatformType } from "./constant/index.js";
import { CrawlerTask } from "./model/index.js";
import { CrawlerFactory } from "./crawl/crawler_factory.js";

// Trạng thái task hiện tại để ghi log vào DB
let currentTaskId: string | null = null;

/**
 * # Gửi request đến Supabase PostgREST API
 */
async function supabaseRest(path: string, options: { method?: string; body?: any; params?: Record<string, string>; headers?: Record<string, string> } = {}): Promise<any> {
  const urlObj = new URL(`${CONFIG.supabase.url}/rest/v1/${path}`);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      urlObj.searchParams.append(key, value);
    }
  }

  const headers: Record<string, string> = {
    "apikey": CONFIG.supabase.serviceRoleKey,
    "Authorization": `Bearer ${CONFIG.supabase.serviceRoleKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const fetchOptions: any = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(urlObj.toString(), fetchOptions);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase REST error ${res.status}: ${errText}`);
  }

  if (res.status === 204) return null; // No Content
  return res.json();
}

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
 * # Lấy 1 task đang pending từ database
 */
async function fetchPendingTask(): Promise<CrawlerTask | null> {
  try {
    const tasks = await supabaseRest("crawler_tasks", {
      method: "GET",
      params: {
        status: "eq.pending",
        order: "created_at.asc",
        limit: "1",
      },
    });
    return tasks && tasks.length > 0 ? (tasks[0] as CrawlerTask) : null;
  } catch (err: any) {
    logger.error(`Lỗi khi lấy task từ Supabase: ${err.message}`, "Worker");
    return null;
  }
}

/**
 * # Cập nhật trạng thái của task
 */
async function updateTaskStatus(taskId: string, status: "running" | "completed" | "failed", errorMessage?: string): Promise<void> {
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
  await updateTaskStatus(id, "running");

  try {
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
    await closeBrowser().catch(() => { });
  }
}

/**
 * # Vòng lặp chính của Queue Worker
 */
export async function startQueueWorker(): Promise<void> {
  logger.info("Khởi chạy Crawler Queue Worker... Đang lắng nghe task từ Supabase...", "Worker");

  while (true) {
    const task = await fetchPendingTask();
    if (task) {
      await executeTask(task);
    }
    // Dừng 5 giây trước khi check task tiếp theo (Polling)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
