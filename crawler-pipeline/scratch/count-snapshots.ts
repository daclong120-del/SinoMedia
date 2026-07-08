import { CONFIG } from "../src/config.js";

async function main() {
  const headers = {
    apikey: CONFIG.supabase.serviceRoleKey,
    Authorization: `Bearer ${CONFIG.supabase.serviceRoleKey}`,
  };

  try {
    // 1. Post metric snapshots
    const postsRes = await fetch(`${CONFIG.supabase.url}/rest/v1/post_metric_snapshots?select=id`, {
      method: "GET",
      headers: {
        ...headers,
        "Prefer": "count=exact"
      }
    });
    const postsRange = postsRes.headers.get("Content-Range");
    const postsCount = postsRange ? postsRange.split("/")[1] : "0";

    // 2. Author metric snapshots
    const authorsRes = await fetch(`${CONFIG.supabase.url}/rest/v1/author_metric_snapshots?select=id`, {
      method: "GET",
      headers: {
        ...headers,
        "Prefer": "count=exact"
      }
    });
    const authorsRange = authorsRes.headers.get("Content-Range");
    const authorsCount = authorsRange ? authorsRange.split("/")[1] : "0";

    // 3. Print samples
    const samplePostRes = await fetch(`${CONFIG.supabase.url}/rest/v1/post_metric_snapshots?limit=3`, {
      method: "GET",
      headers
    });
    const samplePosts = await samplePostRes.json();

    console.log("\n=============================================");
    console.log("📊 THỐNG KÊ SNAPSHOTS METRICS TRONG DATABASE:");
    console.log("=============================================");
    console.log(` - Post metric snapshots: ${postsCount} bản ghi`);
    console.log(` - Author metric snapshots: ${authorsCount} bản ghi`);
    console.log("=============================================");
    console.log(" Mẫu dữ liệu post snapshots:", JSON.stringify(samplePosts, null, 2));
    console.log("=============================================\n");
  } catch (error: any) {
    console.error("❌ Lỗi:", error.message);
  }
}

main().catch(console.error);
