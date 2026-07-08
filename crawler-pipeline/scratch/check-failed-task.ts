import { supabaseRest } from "../src/store/supabase_client.js";

async function runTest() {
  const tasks = await supabaseRest("crawler_tasks", {
    method: "GET",
    params: {
      platform: "eq.bilibili",
      command: "eq.search",
      order: "created_at.desc",
      limit: "5"
    }
  });
  console.log("=== Recent Tasks Status ===");
  tasks.forEach((task: any) => {
    console.log(`Task ID: ${task.id} | Target: ${task.target} | Status: ${task.status} | Error: ${task.error_message}`);
  });
}
runTest();
