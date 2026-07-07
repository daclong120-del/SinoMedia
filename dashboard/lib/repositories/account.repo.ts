/**
 * Repository — crawler_accounts
 * Tầng duy nhất chạm bảng `crawler_accounts` trong Supabase.
 */
import type { DbClient, TableRow } from "./types";

export class AccountRepository {
  constructor(private readonly db: DbClient) {}

  /** Lấy tất cả tài khoản crawler */
  async findAll(): Promise<TableRow<"crawler_accounts">[]> {
    const { data, error } = await this.db
      .from("crawler_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /** Lấy thông tin platform + status (cho platform health metrics) */
  async findAllWithStatus(): Promise<Pick<TableRow<"crawler_accounts">, "platform" | "status">[]> {
    const { data, error } = await this.db
      .from("crawler_accounts")
      .select("platform, status");
    if (error) throw error;
    return (data as Pick<TableRow<"crawler_accounts">, "platform" | "status">[]) ?? [];
  }
}
