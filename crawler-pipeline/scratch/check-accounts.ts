import { CONFIG } from "../src/config.js";

async function main() {
  const headers = {
    apikey: CONFIG.supabase.serviceRoleKey,
    Authorization: `Bearer ${CONFIG.supabase.serviceRoleKey}`,
  };

  try {
    const res = await fetch(`${CONFIG.supabase.url}/rest/v1/crawler_accounts?select=platform,status,username,cookie_data`, {
      method: "GET",
      headers,
    });
    
    if (!res.ok) {
      throw new Error(`Error: ${res.status} ${await res.text()}`);
    }

    const accounts = await res.json() as any[];
    console.log("\n=============================================");
    console.log("👥 DANH SÁCH TÀI KHOẢN CRAWLER TRONG DATABASE:");
    console.log("=============================================");
    if (accounts.length === 0) {
      console.log("Không có tài khoản nào.");
    } else {
      accounts.forEach(acc => {
        console.log(` - Platform: ${acc.platform} | User: ${acc.username} | Status: ${acc.status}`);
        console.log(`   Cookie: ${acc.cookie_data ? acc.cookie_data.substring(0, 100) : "empty"}`);
      });
    }
    console.log("=============================================\n");
  } catch (error: any) {
    console.error("❌ Lỗi:", error.message);
  }
}

main().catch(console.error);
