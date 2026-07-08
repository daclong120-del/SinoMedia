import { supabaseRest } from "../src/store/supabase_client.js";

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log("=== BẮT ĐẦU CHẠY THỬ E2E TASK BILIBILI SEARCH 50 ===");
  
  // 1. Tạo task mới
  const taskPayload = {
    platform: "bilibili",
    command: "search",
    target: "dog",
    max_count: 50,
    status: "pending",
    priority: "normal",
    metadata: {
      tags: ["e2e_test"],
      language: "auto",
      crawl_comments: true,
      crawl_sub_comments: true,
      headless: true
    }
  };

  console.log("Đang tạo task mới trên DB...");
  const createRes = await supabaseRest("crawler_tasks", {
    method: "POST",
    body: taskPayload,
    headers: {
      "Prefer": "return=representation"
    }
  });

  if (!Array.isArray(createRes) || createRes.length === 0) {
    console.error("Lỗi: Không tạo được task!");
    return;
  }

  const task = createRes[0];
  const taskId = task.id;
  console.log(`Đã tạo task thành công! ID: ${taskId}`);

  console.log("Bắt đầu giám sát tiến trình task... Vui lòng kiểm tra worker log ở cửa sổ worker.");
  
  let finished = false;
  let lastProgressStr = "";
  let lastStatus = "";

  while (!finished) {
    await sleep(5000);

    const checkRes = await supabaseRest("crawler_tasks", {
      method: "GET",
      params: {
        id: `eq.${taskId}`
      }
    });

    if (!Array.isArray(checkRes) || checkRes.length === 0) {
      console.log("Không tìm thấy task trong DB, có thể bị xóa.");
      break;
    }

    const currentTask = checkRes[0];
    const status = currentTask.status;
    const progress = currentTask.metadata?.progress;
    const progressStr = progress ? `Tiến độ: ${progress.current}/${progress.target}` : "Tiến độ: N/A";

    if (status !== lastStatus || progressStr !== lastProgressStr) {
      console.log(`[Task ID: ${taskId}] Trạng thái: ${status.toUpperCase()} | ${progressStr}`);
      lastStatus = status;
      lastProgressStr = progressStr;
    }

    if (status === "completed" || status === "failed") {
      finished = true;
      console.log("\nTask đã kết thúc!");
      console.log(`Trạng thái cuối cùng: ${status.toUpperCase()}`);
      if (status === "failed") {
        console.error(`Lỗi: ${currentTask.error_message}`);
      }
      break;
    }
  }

  // Lấy 15 dòng logs cuối cùng của task này từ crawler_logs để hiển thị
  console.log("\nLogs của task từ database:");
  try {
    const logs = await supabaseRest("crawler_logs", {
      method: "GET",
      params: {
        task_id: `eq.${taskId}`,
        order: "id.asc"
      }
    });
    if (Array.isArray(logs)) {
      logs.forEach(log => {
        console.log(`[${log.level.toUpperCase()}] ${log.message}`);
      });
    }
  } catch (err: any) {
    console.error(`Không thể lấy logs: ${err.message}`);
  }

  console.log("\n=== HOÀN THÀNH TIẾN TRÌNH E2E TEST ===");
}

run().catch(err => {
  console.error("Có lỗi xảy ra khi chạy E2E script:", err);
});
