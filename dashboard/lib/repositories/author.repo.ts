/**
 * Repository — crawled_authors
 * Tầng duy nhất chạm bảng `crawled_authors` trong Supabase.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthorQueryOpts {
  platform?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class AuthorRepository {
  constructor(private db: SupabaseClient) {}

  /** Lấy danh sách tác giả có phân trang + lọc */
  async findMany(opts: AuthorQueryOpts = {}) {
    const limit = opts.limit ?? 50;
    let query = this.db
      .from("crawled_authors")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (opts.platform && opts.platform !== "all") {
      query = query.eq("platform", opts.platform);
    }
    if (opts.search) {
      query = query.ilike("nickname", `%${opts.search}%`);
    }
    if (opts.offset) {
      query = query.range(opts.offset, opts.offset + limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }

  /** Đếm tổng số tác giả */
  async count(): Promise<number> {
    const { count, error } = await this.db
      .from("crawled_authors")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  }

  /** Lấy chi tiết 1 tác giả theo ID */
  async findById(id: string) {
    const { data, error } = await this.db
      .from("crawled_authors")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  /** Lấy nhiều tác giả theo danh sách ID */
  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from("crawled_authors")
      .select("*")
      .in("id", ids);
    if (error) throw error;
    return data ?? [];
  }
}
