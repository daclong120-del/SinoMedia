import { supabaseRest } from "../src/store/supabase_client.js";
import { CONFIG } from "../src/config.js";

async function runTest() {
  const tasks = await supabaseRest("crawler_tasks", {
    method: "GET",
    params: {
      id: "eq.05c4b9eb-32b5-468b-9090-aa05d162ef47"
    }
  });
  console.log("=== Task Status ===");
  console.log(JSON.stringify(tasks[0], null, 2));

  if (tasks[0]) {
    const logs = await supabaseRest("crawler_logs", {
      method: "GET",
      params: {
        task_id: `eq.${tasks[0].id}`,
        order: "created_at.asc"
      }
    });
    console.log("\n=== Task Logs ===");
    logs.forEach((log: any) => {
      console.log(`[${log.level}] ${log.message}`);
    });
  }
}
runTest();
