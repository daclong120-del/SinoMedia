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
    // 1. Đọc file bilibili_session.json cục bộ
    const sessionPath = join(process.cwd(), "output", "bilibili_session.json");
    const sessionContent = readFileSync(sessionPath, "utf8");
    const sessionData = JSON.parse(sessionContent);
    const cookieVal = sessionData.cookie || "";
    console.log(`Đã đọc bilibili_session.json: Cookie length ${cookieVal.length}`);

    if (!cookieVal) {
      throw new Error("Không có cookie trong session file");
    }

    // 2. Query thông tin tài khoản bili_acc_1
    const resGet = await fetch(`${CONFIG.supabase.url}/rest/v1/crawler_accounts?platform=eq.bilibili&username=eq.bili_acc_1`, {
      method: "GET",
      headers,
    });
    const accounts = await resGet.json() as any[];
    if (accounts.length === 0) {
      throw new Error("Không tìm thấy tài khoản bili_acc_1 trong database");
    }
    const account = accounts[0];

    // 3. Update cookie_data
    const resPatch = await fetch(`${CONFIG.supabase.url}/rest/v1/crawler_accounts?id=eq.${account.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        cookie_data: cookieVal,
        status: "active",
        failure_count: 0,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!resPatch.ok) {
      throw new Error(`Update error: ${resPatch.status} ${await resPatch.text()}`);
    }

    console.log("=============================================");
    console.log("✅ Cập nhật cookie Bilibili thành công vào database pool!");
    console.log("=============================================");
  } catch (error: any) {
    console.error("❌ Lỗi:", error.message);
  }
}

main().catch(console.error);
