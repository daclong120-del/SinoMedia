import { CONFIG } from "../src/config.js";

async function main() {
  const headers = {
    apikey: CONFIG.supabase.serviceRoleKey,
    Authorization: `Bearer ${CONFIG.supabase.serviceRoleKey}`,
  };

  try {
    const res = await fetch(`${CONFIG.supabase.url}/rest/v1/crawled_posts?select=id,platform,platform_id,media_source,media_status,media_urls,cover_url,media_error,crawled_at&order=crawled_at.desc&limit=5`, {
      method: "GET",
      headers,
    });
    
    if (!res.ok) {
      throw new Error(`Error: ${res.status} ${await res.text()}`);
    }

    const posts = await res.json() as any[];
    console.log("=============================================");
    console.log("5 Posts gần nhất:");
    console.log(JSON.stringify(posts, null, 2));
    console.log("=============================================");
  } catch (error: any) {
    console.error("❌ Lỗi:", error.message);
  }
}

main().catch(console.error);
