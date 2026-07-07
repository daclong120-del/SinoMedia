import type { DbClient } from "./types";

export interface ApiTokenWithCreator {
  id: string;
  name: string;
  token_prefix: string;
  role_id: string;
  created_at: string;
  profiles: {
    email: string;
  } | null;
}

export class ApiTokenRepository {
  constructor(private readonly db: DbClient) {}

  /** Lấy danh sách API Tokens cùng thông tin người tạo */
  async getApiTokens(): Promise<ApiTokenWithCreator[]> {
    const { data, error } = await this.db
      .from("api_tokens")
      .select(`
        id,
        name,
        token_prefix,
        role_id,
        created_at,
        profiles (
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as ApiTokenWithCreator[]) ?? [];
  }

  /** Tạo API Token mới */
  async createApiToken(
    name: string,
    tokenHash: string,
    tokenPrefix: string,
    roleId: string,
    createdBy: string
  ): Promise<void> {
    const { error } = await this.db
      .from("api_tokens")
      .insert({
        name,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        role_id: roleId,
        created_by: createdBy
      });

    if (error) throw error;
  }

  /** Thu hồi API Token */
  async revokeApiToken(tokenId: string): Promise<void> {
    const { error } = await this.db
      .from("api_tokens")
      .delete()
      .eq("id", tokenId);

    if (error) throw error;
  }
}
