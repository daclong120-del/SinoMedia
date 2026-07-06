/**
 * Service — Crawler Management (Tasks, Accounts, Logs)
 * Phục vụ các trang Tasks, Accounts.
 */
import { createClientServer } from "@/lib/supabase/server";
import { TaskRepository, type CreateTaskInput } from "@/lib/repositories/task.repo";
import { AccountRepository } from "@/lib/repositories/account.repo";
import { LogRepository } from "@/lib/repositories/log.repo";
import type { CrawlerTask, CrawlerAccount, CrawlerLogEntry, Platform } from "@/types";

// ─── Mappers ─────────────────────────────────────────────────

function mapDbTask(row: Record<string, unknown>): CrawlerTask {
  return {
    id: row.id as string,
    platform: row.platform as Platform,
    command: (row.command as CrawlerTask["command"]) || "search",
    target: (row.target as string) || "",
    status: (row.status as CrawlerTask["status"]) || "pending",
    priority: (row.priority as CrawlerTask["priority"]) || "normal",
    scheduled_at: (row.scheduled_at as string) || null,
    created_at: (row.created_at as string) || "",
    created_by: "system",
    metadata: (row.metadata as CrawlerTask["metadata"]) || {},
  };
}

function mapDbAccount(row: Record<string, unknown>): CrawlerAccount {
  return {
    id: row.id as string,
    platform: row.platform as Platform,
    alias: (row.alias as string) || (row.username as string) || "unknown",
    status: (row.status as CrawlerAccount["status"]) || "active",
    failure_count: (row.failure_count as number) || 0,
    proxy: null,
    last_used_at: (row.last_used_at as string) || null,
    created_at: (row.created_at as string) || "",
  };
}

function mapDbLog(row: Record<string, unknown>): CrawlerLogEntry {
  return {
    id: String(row.id),
    task_id: row.task_id as string,
    level: ((row.level as string)?.toUpperCase() || "INFO") as CrawlerLogEntry["level"],
    message: (row.message as string) || "",
    created_at: (row.created_at as string) || "",
  };
}

// ─── Service Functions ───────────────────────────────────────

/** Lấy danh sách task crawler đã map sang app type */
export async function getTasks(): Promise<CrawlerTask[]> {
  const db = await createClientServer();
  const repo = new TaskRepository(db);
  const data = await repo.findAll();
  return data.map(mapDbTask);
}

/** Tạo task crawler mới */
export async function createTask(input: CreateTaskInput): Promise<CrawlerTask> {
  const db = await createClientServer();
  const repo = new TaskRepository(db);
  const data = await repo.create(input);
  return mapDbTask(data);
}

/** Tạo hàng loạt task qua RPC (atomic, dedup) */
export async function createTasksBulk(tasks: CreateTaskInput[]): Promise<{
  inserted_count: number;
  skipped_count: number;
  errors: string[];
} | null> {
  try {
    const db = await createClientServer();
    const repo = new TaskRepository(db);
    return await repo.createBulk(tasks);
  } catch (err) {
    console.error("[CrawlerService] createTasksBulk thất bại:", err);
    return null;
  }
}

/** Huỷ task (chuyển sang trạng thái "cancelled") */
export async function cancelTask(id: string): Promise<void> {
  const db = await createClientServer();
  const repo = new TaskRepository(db);
  await repo.updateStatus(id, "cancelled");
}

/** Thử lại task thất bại (chuyển sang trạng thái "pending") */
export async function retryTask(id: string): Promise<void> {
  const db = await createClientServer();
  const repo = new TaskRepository(db);
  await repo.updateStatus(id, "pending");
}

/** Lấy log của một task cụ thể */
export async function getTaskLogs(taskId: string): Promise<CrawlerLogEntry[]> {
  const db = await createClientServer();
  const repo = new LogRepository(db);
  const data = await repo.findByTaskId(taskId);
  return data.map(mapDbLog);
}

/** Lấy danh sách tài khoản crawler */
export async function getAccounts(): Promise<CrawlerAccount[]> {
  const db = await createClientServer();
  const repo = new AccountRepository(db);
  const data = await repo.findAll();
  return data.map(mapDbAccount);
}
