import { CONFIG } from "../src/config.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const headers = {
    apikey: CONFIG.supabase.serviceRoleKey,
    Authorization: `Bearer ${CONFIG.supabase.serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Đọc file session.json cục bộ
    const sessionPath = join(process.cwd(), "output", "session.json");
    const sessionContent = readFileSync(sessionPath, "utf8");
    const sessionData = JSON.parse(sessionContent);
    console.log(`Đã đọc session.json cục bộ: ${sessionData.cookies?.length} cookies, msToken length: ${sessionData.msToken?.length}`);

    // 2. Query thông tin tài khoản douyin_acc_1
    const resGet = await fetch(`${CONFIG.supabase.url}/rest/v1/crawler_accounts?platform=eq.douyin&username=eq.douyin_acc_1`, {
      method: "GET",
      headers,
    });
    const accounts = await resGet.json() as any[];
    if (accounts.length === 0) {
      throw new Error("Không tìm thấy tài khoản douyin_acc_1 trong database");
    }
    const account = accounts[0];

    // 3. Update cookie_data
    const resPatch = await fetch(`${CONFIG.supabase.url}/rest/v1/crawler_accounts?id=eq.${account.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        cookie_data: sessionContent,
        status: "active",
        failure_count: 0,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!resPatch.ok) {
      throw new Error(`Update error: ${resPatch.status} ${await resPatch.text()}`);
    }

    console.log("=============================================");
    console.log("✅ Cập nhật cookie Douyin thành công vào database pool!");
    console.log("=============================================");
  } catch (error: any) {
    console.error("❌ Lỗi:", error.message);
  }
}

main().catch(console.error);
