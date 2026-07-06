/**
 * Repository — audit_logs + exported_files
 * Tầng duy nhất chạm bảng `audit_logs` và `exported_files` trong Supabase.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEventInput {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  ip_address: string;
}

export interface ExportFileInput {
  filename: string;
  type: "xlsx" | "csv";
  filter_snapshot: Record<string, unknown>;
  size_bytes: number;
  created_by: string;
  download_url: string;
}

export class AuditRepository {
  constructor(private db: SupabaseClient) {}

  // ─── Audit Logs ──────────────────────────────────────────────

  /** Lấy danh sách audit log, mới nhất trước */
  async getAuditLogs(limit = 100) {
    const { data, error } = await this.db
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  /** Ghi 1 sự kiện audit */
  async logEvent(event: AuditEventInput) {
    const { error } = await this.db
      .from("audit_logs")
      .insert([event]);
    if (error) throw error;
  }

  // ─── Exported Files ──────────────────────────────────────────

  /** Lấy danh sách file đã xuất */
  async getExports() {
    const { data, error } = await this.db
      .from("exported_files")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /** Ghi 1 bản ghi file xuất mới */
  async logExport(file: ExportFileInput) {
    const { error } = await this.db
      .from("exported_files")
      .insert([file]);
    if (error) throw error;
  }
}
