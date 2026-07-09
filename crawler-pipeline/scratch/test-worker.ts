import { CONFIG } from '../src/config.js';

async function run() {
  const supabaseUrl = CONFIG.supabase.url;
  const serviceRoleKey = CONFIG.supabase.serviceRoleKey;
  
  console.log("--- Worker Smoke Test ---");
  
  // 1. Claim task
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_next_crawler_task`, {
    method: "POST",
    headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" }
  });
  console.log("1. Claim task:", rpcRes.status);
  
  // 2. Ghi crawler_logs
  const logRes = await fetch(`${supabaseUrl}/rest/v1/crawler_logs`, {
    method: "POST",
    headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ level: "info", message: "Smoke test log" })
  });
  console.log("2. Ghi log:", logRes.status);
  
  // 3. Upsert crawled_posts
  const postRes = await fetch(`${supabaseUrl}/rest/v1/crawled_posts`, {
    method: "POST",
    headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ platform: "bilibili", platform_id: "smoke_test_123", title: "Smoke Test" })
  });
  console.log("3. Upsert post:", postRes.status);
}
run();
