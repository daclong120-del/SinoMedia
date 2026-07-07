import { CONFIG } from "../src/config.js";
import { supabaseRest } from "../src/store/supabase_client.js";

async function main() {
  // Video cần test: BV1E7wtzaEdq (video này đang có status là 'failed' do lần trước download lỗi)
  // Chúng ta sẽ insert một task cache_media cho nó để worker chạy
  const targetBvid = "BV1E7wtzaEdq";
  
  console.log(`Đang tạo task cache_media cho video Bilibili: ${targetBvid}...`);
  try {
    const task = await supabaseRest("crawler_tasks", {
      method: "POST",
      body: {
        platform: "bilibili",
        command: "cache_media",
        target: targetBvid,
        status: "pending",
        metadata: {
          upload_r2: true,
          headless: true
        }
      }
    });

    console.log("✅ Đã tạo task thành công! Task details:");
    console.log(JSON.stringify(task, null, 2));
  } catch (error: any) {
    console.error("❌ Lỗi khi tạo task:", error.message);
  }
}

main().catch(console.error);
