/**
 * Repository — crawler_tasks
 * Tầng duy nhất chạm bảng `crawler_tasks` trong Supabase.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreateTaskInput {
  platform: string;
  command: string;
  target: string;
  priority?: string;
  scheduled_at?: string | null;
  metadata?: Record<string, unknown>;
}

export class TaskRepository {
  constructor(private db: SupabaseClient) {}

  /** Lấy tất cả task, sắp xếp theo ngày tạo mới nhất */
  async findAll(limit = 100) {
    const { data, error } = await this.db
      .from("crawler_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  /** Lấy task với trạng thái cụ thể (dùng cho metrics) */
  async findAllWithStatus() {
    const { data, error } = await this.db
      .from("crawler_tasks")
      .select("id, status");
    if (error) throw error;
    return data ?? [];
  }

  /** Tạo task mới */
  async create(input: CreateTaskInput) {
    const { data, error } = await this.db
      .from("crawler_tasks")
      .insert([{
        platform: input.platform,
        command: input.command,
        target: input.target,
        priority: input.priority ?? "normal",
        status: "pending",
        scheduled_at: input.scheduled_at ?? null,
        metadata: input.metadata ?? {},
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Cập nhật trạng thái task */
  async updateStatus(id: string, status: string) {
    const { error } = await this.db
      .from("crawler_tasks")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  }

  /** Tạo hàng loạt task qua RPC (atomic, dedup) */
  async createBulk(tasks: CreateTaskInput[]): Promise<{
    inserted_count: number;
    skipped_count: number;
    errors: string[];
  } | null> {
    const { data, error } = await this.db
      .rpc("create_crawler_tasks", { p_tasks: tasks });
    if (error) throw error;
    return data as {
      inserted_count: number;
      skipped_count: number;
      errors: string[];
    };
  }
}
