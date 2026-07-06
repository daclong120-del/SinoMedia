/**
 * Repository — crawler_logs
 * Tầng duy nhất chạm bảng `crawler_logs` trong Supabase.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export class LogRepository {
  constructor(private db: any) {}

  /** Lấy danh sách log theo task_id, sắp xếp theo thời gian */
  async findByTaskId(taskId: string, limit = 200) {
    const { data, error } = await this.db
      .from("crawler_logs")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }
}
