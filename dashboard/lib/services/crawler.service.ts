/**
 * Service — Crawler Management (Tasks, Accounts, Logs)
 * Phục vụ các trang Tasks, Accounts.
 */
import { createClientServer } from "@/lib/supabase/server";
import { TaskRepository, type CreateTaskInput } from "@/lib/repositories/task.repo";
import { AccountRepository } from "@/lib/repositories/account.repo";
import { ProxyRepository } from "@/lib/repositories/proxy.repo";
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

function mapDbAccount(row: DbAccount & { proxy?: string | null }): CrawlerAccount {
  return {
    id: row.id,
    platform: row.platform as Platform,
    alias: row.username || "unknown",
    status: (row.status as CrawlerAccount["status"]) || "active",
    failure_count: row.failure_count || 0,
    proxy: row.proxy || null,
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
    console.error("[CrawlerService] getTasks failed:", err);
    throw err;
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
    console.error(`[CrawlerService] getTaskLogs failed for task ${taskId}:`, err);
    throw err;
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
    console.error("[CrawlerService] getAccounts failed:", err);
    throw err;
  }
}

/** Helper parse chuỗi proxy format host:port[:user:pass] */
function parseProxyString(proxyStr: string) {
  const parts = proxyStr.trim().split(":");
  if (parts.length < 2) return null;
  const host = parts[0];
  const port = parseInt(parts[1], 10);
  if (isNaN(port)) return null;
  const username = parts[2] || null;
  const password = parts[3] || null;
  return {
    host,
    port,
    username,
    password,
    protocol: "http" as const,
    status: "active" as const,
  };
}

/** Thêm hoặc cập nhật tài khoản crawler */
export async function createAccount(
  platform: string,
  username: string,
  cookieData: string,
  proxyStr?: string | null
): Promise<void> {
  const db = await createClientServer();
  const accountRepo = new AccountRepository(db as unknown as DbClient);
  const proxyRepo = new ProxyRepository(db as unknown as DbClient);

  // Normalize platform sang lowercase (ví dụ: Douyin -> douyin)
  const normalizedPlatform = platform.toLowerCase();

  // Kiểm tra xem tài khoản đã tồn tại chưa
  const existingAccount = await accountRepo.findByPlatformAndUsername(normalizedPlatform, username);
  const isNew = !existingAccount;

  // 1. Lưu hoặc cập nhật tài khoản
  const account = await accountRepo.createOrUpdate(normalizedPlatform, username, cookieData);

  // 2. Xử lý proxy riêng nếu có
  try {
    if (proxyStr && proxyStr.trim()) {
      const parsed = parseProxyString(proxyStr);
      if (parsed) {
        // Tìm xem proxy đã tồn tại chưa
        const existingProxy = await proxyRepo.findByHostAndPort(parsed.host, parsed.port);
        let proxyId: string;

        if (existingProxy) {
          proxyId = existingProxy.id;
          // Cập nhật assigned_account_id và thông tin xác thực
          await proxyRepo.update(proxyId, {
            assigned_account_id: account.id,
            username: parsed.username,
            password: parsed.password,
            status: "active"
          });
        } else {
          // Tạo proxy mới
          const newProxy = await proxyRepo.create({
            host: parsed.host,
            port: parsed.port,
            username: parsed.username,
            password: parsed.password,
            protocol: parsed.protocol,
            status: parsed.status,
            assigned_account_id: account.id
          });
          proxyId = newProxy.id;
        }

        // Gỡ gán tài khoản này khỏi các proxy khác
        await proxyRepo.unassignOtherProxies(account.id, proxyId);
      }
    } else {
      // Nếu không nhập proxy, gỡ gán toàn bộ proxy cũ của account này
      await proxyRepo.unassignAllProxiesForAccount(account.id);
    }
  } catch (proxyError) {
    console.error("[CrawlerService] Proxy assignment failed, rolling back account creation:", proxyError);
    if (isNew) {
      try {
        await accountRepo.deleteById(account.id);
      } catch (rollbackError) {
        console.error("[CrawlerService] Rollback failed (failed to delete account):", rollbackError);
      }
    }
    throw new Error(`Xử lý proxy thất bại, đã ${isNew ? "rollback nạp tài khoản mới" : "khôi phục tài khoản cũ"}: ${(proxyError as Error).message}`);
  }
}

/** Kích hoạt lại (unban) tài khoản */
export async function unbanAccount(id: string): Promise<void> {
  const db = await createClientServer();
  const repo = new AccountRepository(db as unknown as DbClient);
  await repo.updateStatus(id, "active");
}

/** Xóa tài khoản */
export async function deleteAccount(id: string): Promise<void> {
  const db = await createClientServer();
  const repo = new AccountRepository(db as unknown as DbClient);
  await repo.deleteById(id);
}
