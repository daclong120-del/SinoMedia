import { CONFIG } from "../src/config.js";

async function main() {
  const headers = {
    apikey: CONFIG.supabase.serviceRoleKey,
    Authorization: `Bearer ${CONFIG.supabase.serviceRoleKey}`,
  };

  try {
    const res = await fetch(`${CONFIG.supabase.url}/rest/v1/crawled_posts?select=id,platform,platform_id,author_id`, {
      method: "GET",
      headers,
    });
    
    if (!res.ok) {
      throw new Error(`Error: ${res.status} ${await res.text()}`);
    }

    const posts = await res.json() as any[];
    console.log("=============================================");
    console.log("Posts in DB:");
    console.log(JSON.stringify(posts, null, 2));
    console.log("=============================================");
  } catch (error: any) {
    console.error("❌ Lỗi:", error.message);
  }
}

main().catch(console.error);
