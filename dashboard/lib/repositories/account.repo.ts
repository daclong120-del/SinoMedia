/**
 * Repository — crawler_accounts
 * Tầng duy nhất chạm bảng `crawler_accounts` trong Supabase.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export class AccountRepository {
  constructor(private db: SupabaseClient) {}

  /** Lấy tất cả tài khoản crawler */
  async findAll() {
    const { data, error } = await this.db
      .from("crawler_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /** Lấy thông tin platform + status (cho platform health metrics) */
  async findAllWithStatus() {
    const { data, error } = await this.db
      .from("crawler_accounts")
      .select("platform, status");
    if (error) throw error;
    return data ?? [];
  }
}
