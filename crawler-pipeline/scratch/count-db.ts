import { CONFIG } from "../src/config.js";

async function main() {
  const headers = {
    apikey: CONFIG.supabase.serviceRoleKey,
    Authorization: `Bearer ${CONFIG.supabase.serviceRoleKey}`,
  };

  try {
    // 1. Đếm số lượng crawled_posts
    const postsRes = await fetch(`${CONFIG.supabase.url}/rest/v1/crawled_posts?select=id`, {
      method: "GET",
      headers: {
        ...headers,
        "Prefer": "count=exact"
      }
    });
    
    // Đọc header Content-Range dạng "0-9/25" để lấy tổng số lượng
    const postsRange = postsRes.headers.get("Content-Range");
    const postsCount = postsRange ? postsRange.split("/")[1] : "0";

    // 2. Đếm số lượng crawled_authors
    const authorsRes = await fetch(`${CONFIG.supabase.url}/rest/v1/crawled_authors?select=id`, {
      method: "GET",
      headers: {
        ...headers,
        "Prefer": "count=exact"
      }
    });
    const authorsRange = authorsRes.headers.get("Content-Range");
    const authorsCount = authorsRange ? authorsRange.split("/")[1] : "0";

    // 3. Đếm số lượng crawler_tasks
    const tasksRes = await fetch(`${CONFIG.supabase.url}/rest/v1/crawler_tasks?select=id`, {
      method: "GET",
      headers: {
        ...headers,
        "Prefer": "count=exact"
      }
    });
    const tasksRange = tasksRes.headers.get("Content-Range");
    const tasksCount = tasksRange ? tasksRange.split("/")[1] : "0";

    console.log("\n=============================================");
    console.log("📊 THỐNG KÊ SỐ LƯỢNG DỮ LIỆU TRONG SUPABASE THẬT:");
    console.log("=============================================");
    console.log(` - Số lượng bài viết (crawled_posts): ${postsCount} bài`);
    console.log(` - Số lượng tác giả (crawled_authors): ${authorsCount} người`);
    console.log(` - Số lượng nhiệm vụ (crawler_tasks): ${tasksCount} task`);
    console.log("=============================================\n");
  } catch (error: any) {
    console.error("❌ Lỗi khi kết nối database hoặc database chưa chạy:", error.message);
  }
}

main().catch(console.error);
