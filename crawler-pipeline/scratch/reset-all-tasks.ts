import { supabaseRest } from "../src/store/supabase_client.js";

async function run() {
  console.log("Đang tìm và reset tất cả nhiệm vụ Bilibili Search về pending...");

  // Tìm các task search của bilibili
  const tasks = await supabaseRest("crawler_tasks", {
    method: "GET",
    params: {
      platform: "eq.bilibili",
      command: "eq.search"
    }
  });

  for (const task of tasks) {
    console.log(`Reset task: ${task.id} (${task.command} | ${task.target})`);
    await supabaseRest("crawler_tasks", {
      method: "PATCH",
      params: { id: `eq.${task.id}` },
      body: {
        status: "pending",
        error_message: null
      }
    });
  }
  console.log("Đã reset tất cả nhiệm vụ thành công!");
}
run();
