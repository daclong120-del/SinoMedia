/**
 * Realtime Subscriptions — File DUY NHẤT import browser Supabase client.
 * Cung cấp WebSocket subscriptions cho các bảng cần lắng nghe thay đổi live.
 */
import { createClientBrowser } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CrawlerTask, CrawlerLogEntry, Platform } from "@/types";

// ─── Mappers (cần ở client-side) ─────────────────────────────

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

function mapDbLog(row: Record<string, unknown>): CrawlerLogEntry {
  return {
    id: String(row.id),
    task_id: row.task_id as string,
    level: ((row.level as string)?.toUpperCase() || "INFO") as CrawlerLogEntry["level"],
    message: (row.message as string) || "",
    created_at: (row.created_at as string) || "",
  };
}

// ─── Subscriptions ───────────────────────────────────────────

/**
 * Lắng nghe thay đổi trên bảng crawler_tasks (UPDATE + INSERT).
 * Trả về RealtimeChannel — gọi channel.unsubscribe() khi component unmount.
 */
export function subscribeToTasks(
  onUpdate: (task: CrawlerTask) => void,
  onInsert?: (task: CrawlerTask) => void,
  onStatusChange?: (status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR", err?: Error) => void,
): RealtimeChannel {
  const supabase = createClientBrowser();

  const channel = supabase
    .channel("tasks-realtime")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "crawler_tasks" },
      (payload) => {
        onUpdate(mapDbTask(payload.new as Record<string, unknown>));
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "crawler_tasks" },
      (payload) => {
        if (onInsert) {
          onInsert(mapDbTask(payload.new as Record<string, unknown>));
        }
      },
    )
    .subscribe((status, err) => {
      if (onStatusChange) {
        onStatusChange(status as "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR", err);
      }
    });

  return channel;
}

/**
 * Lắng nghe log mới của một task cụ thể (INSERT on crawler_logs).
 * Trả về RealtimeChannel — gọi channel.unsubscribe() khi component unmount.
 */
export function subscribeToTaskLogs(
  taskId: string,
  onNewLog: (log: CrawlerLogEntry) => void,
  onStatusChange?: (status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR", err?: Error) => void,
): RealtimeChannel {
  const supabase = createClientBrowser();

  const channel = supabase
    .channel(`task-logs-${taskId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "crawler_logs",
        filter: `task_id=eq.${taskId}`,
      },
      (payload) => {
        onNewLog(mapDbLog(payload.new as Record<string, unknown>));
      },
    )
    .subscribe((status, err) => {
      if (onStatusChange) {
        onStatusChange(status as "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR", err);
      }
    });

  return channel;
}
