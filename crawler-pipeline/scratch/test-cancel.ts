import { supabaseRest } from "../src/store/supabase_client.js";

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function testCancelFlow() {
  console.log("==========================================");
  console.log("CHẠY GIẢ LẬP CANCEL TASK TRỰC TIẾP");
  console.log("==========================================");

  const taskId = "05d3195a-57f0-4944-811f-d74bdde0638c"; // task cat

  // 1. Reset task cat về pending để worker claim
  console.log(`[BƯỚC 1] Đang reset task cat (${taskId}) về pending...`);
  await supabaseRest("crawler_tasks", {
    method: "PATCH",
    params: { id: `eq.${taskId}` },
    body: {
      status: "pending",
      error_message: null
    }
  });

  // 2. Đợi 5 giây để worker bắt đầu cào video 1, 2
  console.log("[BƯỚC 2] Đợi 8 giây cho worker bắt đầu cào video...");
  await sleep(8000);

  // 3. Giả lập bấm Cancel ngoài UI (đổi status thành cancelled)
  console.log("[BƯỚC 3] Giả lập bấm CANCEL ngoài UI (cập nhật status = cancelled)...");
  await supabaseRest("crawler_tasks", {
    method: "PATCH",
    params: { id: `eq.${taskId}` },
    body: {
      status: "cancelled",
      updated_at: new Date().toISOString()
    }
  });

  console.log("[PASS] Đã gửi tín hiệu Hủy thành công. Hãy quan sát logs của worker để thấy nó lập tức dừng cào!");
  console.log("==========================================");
}

testCancelFlow();
