/**
 * Service — System (Settings, Audit Logs, Proxies, Exports)
 * Phục vụ các trang Settings, Audit Logs, Proxies.
 */
import { createClientServer } from "@/lib/supabase/server";
import { ProxyRepository, type CreateProxyInput } from "@/lib/repositories/proxy.repo";
import { AuditRepository, type AuditEventInput, type ExportFileInput } from "@/lib/repositories/audit.repo";
import type { ProxyItem, AuditLogEntry, ExportedFile } from "@/types";

// ─── Constants ───────────────────────────────────────────────

const SETTINGS_KEY = "sinomedia_system_settings";

const DEFAULT_SETTINGS = {
  use2Captcha: true,
  apiKey: "g7a8s9d0a1b2c3d4e5f6",
  collectComments: true,
  collectReplies: true,
  headlessMode: true,
  defaultPriority: "normal",
  maxConcurrentTasks: 3,
  maxRetries: 2,
  defaultWebhookUrl: "",
  notifyOnSuccess: true,
  alertOnFailure: true,
};

// ─── Mappers ─────────────────────────────────────────────────

function mapDbProxy(row: Record<string, unknown>): ProxyItem {
  return {
    id: row.id as string,
    host: row.host as string,
    port: row.port as number,
    username: (row.username as string) || null,
    password: (row.password as string) || null,
    protocol: row.protocol as ProxyItem["protocol"],
    status: row.status as ProxyItem["status"],
    assigned_account_id: (row.assigned_account_id as string) || null,
    assigned_account_alias: (row.assigned_account_alias as string) || null,
    last_used_at: (row.last_used_at as string) || null,
    created_at: row.created_at as string,
  };
}

function mapDbAuditLog(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    actor_id: row.actor_id as string,
    action: row.action as string,
    entity_type: row.entity_type as string,
    entity_id: (row.entity_id as string) || "",
    payload: (row.payload as Record<string, unknown>) || {},
    ip_address: (row.ip_address as string) || "",
    created_at: row.created_at as string,
  };
}

function mapDbExport(row: Record<string, unknown>): ExportedFile {
  return {
    id: row.id as string,
    filename: row.filename as string,
    type: row.type as ExportedFile["type"],
    filter_snapshot: (row.filter_snapshot as Record<string, unknown>) || {},
    size_bytes: Number(row.size_bytes),
    created_by: row.created_by as string,
    download_url: row.download_url as string,
    created_at: row.created_at as string,
  };
}

// ─── Settings (localStorage — giữ nguyên logic refactor-client-storage) ──

/** Đọc cài đặt hệ thống từ localStorage */
export function getSettings(): Record<string, unknown> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Nếu parse lỗi thì trả default
    }
  }
  return { ...DEFAULT_SETTINGS };
}

/** Lưu cài đặt hệ thống vào localStorage */
export function saveSettings(settings: Record<string, unknown>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

// ─── Proxies ─────────────────────────────────────────────────

/** Lấy danh sách proxy */
export async function getProxies(): Promise<ProxyItem[]> {
  const db = await createClientServer();
  const repo = new ProxyRepository(db);
  const data = await repo.findAll();
  return data.map(mapDbProxy);
}

/** Tạo nhiều proxy cùng lúc */
export async function createProxies(proxies: CreateProxyInput[]): Promise<void> {
  const db = await createClientServer();
  const repo = new ProxyRepository(db);
  await repo.createBulk(proxies);
}

/** Xoá proxy */
export async function deleteProxy(id: string): Promise<void> {
  const db = await createClientServer();
  const repo = new ProxyRepository(db);
  await repo.deleteById(id);
}

/** Test kết nối proxy */
export async function testProxy(id: string): Promise<ProxyItem["status"]> {
  const db = await createClientServer();
  const repo = new ProxyRepository(db);
  return repo.testConnection(id);
}

// ─── Audit Logs ──────────────────────────────────────────────

/** Lấy danh sách audit log */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const db = await createClientServer();
  const repo = new AuditRepository(db);
  const data = await repo.getAuditLogs();
  return data.map(mapDbAuditLog);
}

/** Ghi 1 sự kiện audit */
export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  const db = await createClientServer();
  const repo = new AuditRepository(db);
  await repo.logEvent(event);
}

// ─── Exported Files ──────────────────────────────────────────

/** Lấy danh sách file đã xuất */
export async function getExports(): Promise<ExportedFile[]> {
  const db = await createClientServer();
  const repo = new AuditRepository(db);
  const data = await repo.getExports();
  return data.map(mapDbExport);
}

/** Ghi bản ghi file xuất mới */
export async function logExport(file: ExportFileInput): Promise<void> {
  const db = await createClientServer();
  const repo = new AuditRepository(db);
  await repo.logExport(file);
}
