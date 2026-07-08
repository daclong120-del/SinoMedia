import { supabaseRest } from "../src/store/supabase_client.js";

async function run() {
  const taskId = "05c4b9eb-32b5-468b-9090-aa05d162ef47";
  console.log(`Đang reset task ${taskId} về pending...`);
  await supabaseRest("crawler_tasks", {
    method: "PATCH",
    params: { id: `eq.${taskId}` },
    body: {
      status: "pending",
      error_message: null
    }
  });
  console.log("Đã reset task thành công!");
}
run();
