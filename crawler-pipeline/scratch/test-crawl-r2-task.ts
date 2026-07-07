import { CONFIG } from "../src/config.js";
import { supabaseRest } from "../src/store/supabase_client.js";

async function main() {
  // Video cần test: BV1E7wtzaEdq
  // Chúng ta sẽ insert một task crawl thông thường với upload_r2=true để worker chạy
  const targetBvid = "BV1E7wtzaEdq";
  
  console.log(`Đang tạo task crawl (với metadata.upload_r2 = true) cho video Bilibili: ${targetBvid}...`);
  try {
    const task = await supabaseRest("crawler_tasks", {
      method: "POST",
      body: {
        platform: "bilibili",
        command: "crawl",
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
