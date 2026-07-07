import { supabaseRest } from "../src/store/supabase_client.js";

async function main() {
  console.log("Querying crawled_posts from Supabase...");
  try {
    const posts = await supabaseRest("crawled_posts", {
      method: "GET",
      params: {
        select: "id,platform,platform_id,media_type,media_source,media_status,media_urls,original_media_urls,cover_url,original_cover_url,media_error,crawled_at",
        limit: "10",
        order: "crawled_at.desc"
      }
    });

    console.log("Query results (crawled_posts):");
    console.log(JSON.stringify(posts, null, 2));
  } catch (err: any) {
    console.error("❌ Failed to query database:", err.message);
  }
}

main().catch(console.error);
