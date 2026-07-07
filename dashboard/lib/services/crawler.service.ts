/**
 * Service — Crawler Management (Tasks, Accounts, Logs)
 * Phục vụ các trang Tasks, Accounts.
 */
import { createClientServer } from "@/lib/supabase/server";
import { TaskRepository, type CreateTaskInput } from "@/lib/repositories/task.repo";
import { AccountRepository } from "@/lib/repositories/account.repo";
import { LogRepository } from "@/lib/repositories/log.repo";
import type { DbClient } from "@/lib/repositories/types";
import type { CrawlerTask, CrawlerAccount, CrawlerLogEntry, Platform } from "@/types";
import { Database } from "@/types/supabase";

type DbTask = Database["public"]["Tables"]["crawler_tasks"]["Row"];
type DbAccount = Database["public"]["Tables"]["crawler_accounts"]["Row"];
type DbLog = Database["public"]["Tables"]["crawler_logs"]["Row"];

function isDynamicServerUsageError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

async function withSupabaseTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), 1200);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// ─── Mappers ─────────────────────────────────────────────────

function mapDbTask(row: DbTask): CrawlerTask {
  return {
    id: row.id,
    platform: row.platform as Platform,
    command: (row.command as CrawlerTask["command"]) || "search",
    target: row.target,
    status: (row.status as CrawlerTask["status"]) || "pending",
    priority: (row.priority as CrawlerTask["priority"]) || "normal",
    scheduled_at: row.scheduled_at,
    created_at: row.created_at,
    created_by: "system",
    error_message: row.error_message,
    metadata: (row.metadata as CrawlerTask["metadata"]) || {},
  };
}

function mapDbAccount(row: DbAccount): CrawlerAccount {
  return {
    id: row.id,
    platform: row.platform as Platform,
    alias: row.username || "unknown",
    status: (row.status as CrawlerAccount["status"]) || "active",
    failure_count: row.failure_count || 0,
    proxy: null,
    last_used_at: row.last_used_at,
    created_at: row.created_at || "",
  };
}

function mapDbLog(row: DbLog): CrawlerLogEntry {
  return {
    id: String(row.id),
    task_id: row.task_id || "",
    level: ((row.level as string)?.toUpperCase() || "INFO") as CrawlerLogEntry["level"],
    message: row.message || "",
    created_at: row.created_at || "",
  };
}

// ─── Service Functions ───────────────────────────────────────

/** Lấy danh sách task crawler đã map sang app type */
export async function getTasks(): Promise<CrawlerTask[]> {
  try {
    const db = await createClientServer();
    const repo = new TaskRepository(db as unknown as DbClient);
    const data = await withSupabaseTimeout(repo.findAll(), "getTasks.findAll");
    return data.map(mapDbTask);
  } catch (err) {
    if (isDynamicServerUsageError(err)) throw err;
    console.warn("[CrawlerService] getTasks failed; returning empty list:", err);
    return [];
  }
}

/** Tạo task crawler mới */
export async function createTask(input: CreateTaskInput): Promise<CrawlerTask> {
  const db = await createClientServer();
  const repo = new TaskRepository(db as unknown as DbClient);
  const data = await repo.create(input);
  return mapDbTask(data);
}

/** Lấy một task theo ID */
export async function getTaskById(id: string): Promise<CrawlerTask | null> {
  try {
    const db = await createClientServer();
    const repo = new TaskRepository(db as unknown as DbClient);
    const data = await withSupabaseTimeout(repo.findById(id), "getTaskById");
    return data ? mapDbTask(data) : null;
  } catch (err) {
    if (isDynamicServerUsageError(err)) throw err;
    console.warn(`[CrawlerService] getTaskById failed for ${id}:`, err);
    return null;
  }
}

/** Tạo hàng loạt task qua RPC (atomic, dedup) */
export async function createTasksBulk(tasks: CreateTaskInput[]): Promise<{
  inserted_count: number;
  skipped_count: number;
  errors: string[];
} | null> {
  try {
    const db = await createClientServer();
    const repo = new TaskRepository(db as unknown as DbClient);
    return await repo.createBulk(tasks);
  } catch (err) {
    console.error("[CrawlerService] createTasksBulk thất bại:", err);
    return null;
  }
}

/** Huỷ task (chuyển sang trạng thái "cancelled") */
export async function cancelTask(id: string): Promise<void> {
  const db = await createClientServer();
  const repo = new TaskRepository(db as unknown as DbClient);
  await repo.updateStatus(id, "cancelled");
}

/** Thử lại task thất bại (chuyển sang trạng thái "pending") */
export async function retryTask(id: string): Promise<void> {
  const db = await createClientServer();
  const repo = new TaskRepository(db as unknown as DbClient);
  await repo.updateStatus(id, "pending");
}

/** Lấy log của một task cụ thể */
export async function getTaskLogs(taskId: string): Promise<CrawlerLogEntry[]> {
  try {
    const db = await createClientServer();
    const repo = new LogRepository(db as unknown as DbClient);
    const data = await withSupabaseTimeout(repo.findByTaskId(taskId), "getTaskLogs.findByTaskId");
    return data.map(mapDbLog);
  } catch (err) {
    if (isDynamicServerUsageError(err)) throw err;
    console.warn("[CrawlerService] getTaskLogs failed; returning empty list:", err);
    return [];
  }
}

/** Lấy danh sách tài khoản crawler */
export async function getAccounts(): Promise<CrawlerAccount[]> {
  try {
    const db = await createClientServer();
    const repo = new AccountRepository(db as unknown as DbClient);
    const data = await withSupabaseTimeout(repo.findAll(), "getAccounts.findAll");
    return data.map(mapDbAccount);
  } catch (err) {
    if (isDynamicServerUsageError(err)) throw err;
    console.warn("[CrawlerService] getAccounts failed; returning empty list:", err);
    return [];
  }
}

/** Tạo hoặc tái sử dụng task cache_media (Dedupe Task) */
export async function requestMediaCache(
  platform: Platform,
  platformUid: string
): Promise<CrawlerTask> {
  const db = await createClientServer();
  const repo = new TaskRepository(db as unknown as DbClient);

  // 1. Check xem đã có task pending hoặc running cho platform, command = cache_media và target = platformUid chưa
  const { data: existingTasks, error } = await db
    .from("crawler_tasks")
    .select("*")
    .eq("platform", platform)
    .eq("command", "cache_media")
    .eq("target", platformUid)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const tasks = (existingTasks as unknown as DbTask[]) || [];
  if (tasks.length > 0) {
    console.log(`[CrawlerService] Tái sử dụng task cache_media đang hoạt động: ${tasks[0].id}`);
    return mapDbTask(tasks[0]);
  }

  // 2. Nếu không có, tạo task mới
  const newTask = await repo.create({
    platform,
    command: "cache_media",
    target: platformUid,
    priority: "high",
    metadata: {
      headless: true,
      upload_r2: true,
    },
  });

  console.log(`[CrawlerService] Tạo task cache_media mới: ${newTask.id}`);
  return mapDbTask(newTask);
}
