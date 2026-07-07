/**
 * Repository — crawler_proxies
 * Tầng duy nhất chạm bảng `crawler_proxies` trong Supabase.
 */
import type { DbClient, TableRow } from "./types";

export interface CreateProxyInput {
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  protocol: "http" | "https" | "socks5";
  status: "active" | "inactive" | "dead";
}

export class ProxyRepository {
  constructor(private readonly db: DbClient) {}

  /** Lấy tất cả proxy, kèm tên account được gán */
  async findAll(): Promise<(TableRow<"crawler_proxies"> & { assigned_account_alias: string | null })[]> {
    // 2 query song song: proxies + accounts (thay vì join SQL phức tạp)
    const [proxiesRes, accountsRes] = await Promise.all([
      this.db
        .from("crawler_proxies")
        .select("*")
        .order("created_at", { ascending: false }),
      this.db
        .from("crawler_accounts")
        .select("id, username"),
    ]);

    if (proxiesRes.error) throw proxiesRes.error;

    const accountMap = new Map<string, string | null>(
      (accountsRes.data ?? []).map((a) => [a.id, a.username])
    );

    return (proxiesRes.data ?? []).map((row) => ({
      ...row,
      assigned_account_alias: row.assigned_account_id
        ? accountMap.get(row.assigned_account_id) ?? null
        : null,
    }));
  }

  /** Tạo nhiều proxy cùng lúc */
  async createBulk(proxies: CreateProxyInput[]): Promise<void> {
    const { error } = await this.db
      .from("crawler_proxies")
      .insert(proxies.map((p) => ({
        host: p.host,
        port: p.port,
        username: p.username,
        password: p.password,
        protocol: p.protocol,
        status: p.status,
      })));
    if (error) throw error;
  }

  /** Xoá proxy theo ID */
  async deleteById(id: string): Promise<void> {
    const { error } = await this.db
      .from("crawler_proxies")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  /** Test kết nối proxy — TODO: thay bằng real health check khi có backend */
  async testConnection(id: string): Promise<"active" | "dead"> {
    const newStatus: "active" | "dead" = Math.random() > 0.15 ? "active" : "dead";
    const { error } = await this.db
      .from("crawler_proxies")
      .update({ status: newStatus, last_used_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return newStatus;
  }
}
