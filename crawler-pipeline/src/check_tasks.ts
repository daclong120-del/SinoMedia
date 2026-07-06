import { CONFIG } from "./config.js";

async function main() {
  console.log("Supabase URL:", CONFIG.supabase.url);
  
  // Test insert via RPC
  const rpcUrl = `${CONFIG.supabase.url}/rest/v1/rpc/create_crawler_tasks`;
  const testTasks = [
    {
      platform: "zhihu",
      command: "crawl",
      target: "https://www.zhihu.com/question/12345678",
      max_count: 10,
      priority: "normal"
    },
    {
      platform: "douyin",
      command: "crawl",
      target: "https://v.douyin.com/abcde123/",
      max_count: 20,
      priority: "high"
    }
  ];

  console.log("Inserting test tasks...");
  const insertRes = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "apikey": CONFIG.supabase.serviceRoleKey,
      "Authorization": `Bearer ${CONFIG.supabase.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_tasks: testTasks })
  });

  if (!insertRes.ok) {
    const text = await insertRes.text();
    console.error("Error inserting tasks:", insertRes.status, text);
    return;
  }

  const insertResult = await insertRes.json();
  console.log("Insert result:", insertResult);

  // Read tasks back
  const url = `${CONFIG.supabase.url}/rest/v1/crawler_tasks?order=created_at.desc&limit=10`;
  const res = await fetch(url, {
    headers: {
      "apikey": CONFIG.supabase.serviceRoleKey,
      "Authorization": `Bearer ${CONFIG.supabase.serviceRoleKey}`,
      "Content-Type": "application/json",
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Error fetching tasks:", res.status, text);
    return;
  }

  const data = await res.json();
  console.log("Recent tasks in DB:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
