import { supabaseRest } from "../src/store/supabase_client.js";

async function main() {
  if (process.env.CONFIRM_RESET !== "true") {
    console.error("❌ Guard: Phải đặt biến môi trường CONFIRM_RESET=true để chạy script này.");
    process.exit(1);
  }

  const tables = [
    "crawler_logs",
    "crawler_tasks",
    "crawled_comments",
    "crawled_posts",
    "crawled_authors",
    "creative_ads",
    "creative_advertisers",
    "exported_files",
    "audit_logs"
  ];

  console.log("Starting Supabase database reset via PostgREST API...");

  for (const table of tables) {
    try {
      console.log(`Clearing table: ${table}...`);
      // Sử dụng filter id=not.is.null để vượt qua cơ chế an toàn "DELETE requires a WHERE clause" của PostgREST
      await supabaseRest(table, {
        method: "DELETE",
        params: {
          id: "not.is.null"
        }
      });
      console.log(`✅ Cleared ${table}`);
    } catch (err: any) {
      console.error(`❌ Failed to clear ${table}:`, err.message);
    }
  }

  console.log("Database reset operation completed.");
}

main().catch(console.error);
