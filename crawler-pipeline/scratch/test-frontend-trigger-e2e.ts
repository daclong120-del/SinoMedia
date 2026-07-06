/**
 * @fileoverview E2E Simulation Test for Frontend Task Trigger & Crawler Pipeline
 * 
 * Flow:
 * 1. [Frontend] Gửi yêu cầu cào bài viết bằng cách POST task mới (pending) vào Supabase `crawler_tasks`.
 * 2. [Database] Supabase nhận và lưu trữ task.
 * 3. [Queue Worker] Phát hiện task 'pending', chuyển trạng thái sang 'running'.
 * 4. [Crawler] Tiến hành cào dữ liệu từ target, sinh ra bài viết và upsert vào `crawled_posts` (thừa kế tags/language).
 * 5. [Queue Worker] Hoàn thành, chuyển trạng thái task sang 'completed' và ghi log vào `crawler_logs`.
 * 6. [Verification] Xác minh kết quả trạng thái task và bài viết trong cơ sở dữ liệu.
 */

import { executeTask } from "../src/queue_worker.js";
import { CrawlerFactory } from "../src/crawl/crawler_factory.js";
import type { ICrawler } from "../src/base/base_crawler.js";
import type { CrawlerTask } from "../src/model/storage.js";

// Mock Database In-Memory
const db = {
  crawler_tasks: [] as CrawlerTask[],
  crawled_posts: [] as any[],
  crawler_logs: [] as any[],
};

// Lưu giữ fetch gốc
const originalFetch = globalThis.fetch;

// Monkey-patch fetch để giả lập Supabase REST API
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input.toString();
  const method = init?.method || "GET";

  // 1. Endpoint: crawler_tasks
  if (url.includes("/rest/v1/crawler_tasks")) {
    // Frontend thêm task mới
    if (method === "POST") {
      const body = JSON.parse(init?.body as string);
      const tasks = Array.isArray(body) ? body : [body];
      db.crawler_tasks.push(...tasks);
      return new Response(JSON.stringify(body), { status: 201 });
    }
    
    // Worker lấy danh sách tasks hoặc filter
    if (method === "GET") {
      // Giả lập filter task pending đơn giản
      let result = [...db.crawler_tasks];
      if (url.includes("status=eq.pending")) {
        result = result.filter(t => t.status === "pending");
      }
      return new Response(JSON.stringify(result), { status: 200 });
    }

    // Worker cập nhật trạng thái task (running, completed...)
    if (method === "PATCH") {
      const body = JSON.parse(init?.body as string);
      
      // Parse ID từ query parameter ví dụ id=eq.uuid
      const match = url.match(/id=eq\.([^&]+)/);
      if (match) {
        const taskId = match[1];
        const task = db.crawler_tasks.find(t => t.id === taskId);
        if (task) {
          Object.assign(task, body);
          return new Response(JSON.stringify(task), { status: 200 });
        }
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }
  }

  // 2. Endpoint: crawled_posts
  if (url.includes("/rest/v1/crawled_posts")) {
    if (method === "POST") {
      const body = JSON.parse(init?.body as string);
      const posts = Array.isArray(body) ? body : [body];
      db.crawled_posts.push(...posts);
      return new Response(JSON.stringify(body), { status: 200 });
    }
    if (method === "GET") {
      return new Response(JSON.stringify(db.crawled_posts), { status: 200 });
    }
  }

  // 3. Endpoint: crawler_logs
  if (url.includes("/rest/v1/crawler_logs")) {
    if (method === "POST") {
      const body = JSON.parse(init?.body as string);
      db.crawler_logs.push(body);
      return new Response(JSON.stringify(body), { status: 201 });
    }
  }

  return originalFetch(input, init);
};

// Mock Crawler để cào dữ liệu giả lập
class E2EMockCrawler implements ICrawler {
  async start() {}
  async launchBrowser() {}
  async closeBrowser() {}
  async crawl(target: string) {
    console.log(`[Mock Crawler] Đang tiến hành cào target: ${target}...`);
    
    // Ghi nhận bài viết cào được
    const { upsertPost } = await import("../src/store/supabase_writer.js");
    await upsertPost({
      platform: "mock",
      platform_id: "post_e2e_crawled_001",
      caption: "Bài viết cào được từ target channel #cooltag",
      tags: ["post_tag"], // Tag gốc
      language: "auto",
    });
  }
  async creator(target: string) {}
  async search(target: string, max: number) {}
  async comments(target: string, max: number) {}
}

async function runE2ETest() {
  console.log("=== BẮT ĐẦU CHẠY KIỂM THỬ E2E: FRONTEND -> WORKER -> CRAWLER ===");

  // Đăng ký Mock Crawler
  const originalCreate = CrawlerFactory.create;
  CrawlerFactory.create = (platform: string): ICrawler => {
    if (platform === "mock") return new E2EMockCrawler();
    return originalCreate(platform);
  };

  try {
    // ----------------------------------------------------
    // BƯỚC 1: GIẢ LẬP FRONTEND GỬI YÊU CẦU CÀO XUỐNG SUPABASE
    // ----------------------------------------------------
    console.log("\n[Bước 1] Frontend gửi yêu cầu tạo task mới (pending)...");
    
    const frontendTaskPayload = {
      id: "task-frontend-id-8888",
      platform: "mock",
      command: "crawl",
      target: "hot_influencer_channel",
      status: "pending",
      metadata: {
        tags: ["frontend_campaign_tag", "autumn_sales"],
        language: "vi",
        headless: true
      },
      created_at: new Date().toISOString()
    };

    // Gọi API của Supabase REST (thông qua fetch đã mock) để chèn task
    await fetch("http://127.0.0.1:54321/rest/v1/crawler_tasks", {
      method: "POST",
      body: JSON.stringify(frontendTaskPayload),
      headers: { "Content-Type": "application/json" }
    });

    console.log(` -> Đã lưu task vào DB: status = ${db.crawler_tasks[0].status}`);

    // ----------------------------------------------------
    // BƯỚC 2: GIẢ LẬP WORKER PHÁT HIỆN TASK & CHẠY TIẾN TRÌNH CÀO
    // ----------------------------------------------------
    console.log("\n[Bước 2] Worker bắt đầu quét các task 'pending' từ database...");
    
    // Quét task pending
    const tasksRes = await fetch("http://127.0.0.1:54321/rest/v1/crawler_tasks?status=eq.pending");
    const pendingTasks = await tasksRes.json();
    
    if (pendingTasks.length === 0) {
      throw new Error("Không tìm thấy task pending nào!");
    }

    const taskToProcess = pendingTasks[0] as CrawlerTask;
    console.log(` -> Tìm thấy task pending! ID: ${taskToProcess.id}. Chuyển trạng thái sang 'running'...`);

    // Cập nhật trạng thái sang 'running' trong DB
    await fetch(`http://127.0.0.1:54321/rest/v1/crawler_tasks?id=eq.${taskToProcess.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "running" }),
      headers: { "Content-Type": "application/json" }
    });
    console.log(` -> DB Updated: Task status = ${db.crawler_tasks[0].status}`);

    // ----------------------------------------------------
    // BƯỚC 3: THỰC THI NHIỆM VỤ CÀO (WORKER GỌI CRAWLER)
    // ----------------------------------------------------
    console.log("\n[Bước 3] Worker gọi executeTask để chạy MockCrawler cào dữ liệu...");
    await executeTask(taskToProcess);

    // ----------------------------------------------------
    // BƯỚC 4: HOÀN THÀNH VÀ CẬP NHẬT TRẠNG THÁI TASK
    // ----------------------------------------------------
    console.log("\n[Bước 4] Worker hoàn tất nhiệm vụ, chuyển trạng thái task sang 'completed'...");
    
    await fetch(`http://127.0.0.1:54321/rest/v1/crawler_tasks?id=eq.${taskToProcess.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
      headers: { "Content-Type": "application/json" }
    });
    
    // Ghi log hoàn thành
    await fetch("http://127.0.0.1:54321/rest/v1/crawler_logs", {
      method: "POST",
      body: JSON.stringify({
        task_id: taskToProcess.id,
        level: "INFO",
        message: "Cào dữ liệu thành công. Đã cập nhật database.",
        timestamp: new Date().toISOString()
      }),
      headers: { "Content-Type": "application/json" }
    });

    // ----------------------------------------------------
    // BƯỚC 5: XÁC MINH TOÀN DIỆN KẾT QUẢ CUỐI CÙNG (ASSERTIONS)
    // ----------------------------------------------------
    console.log("\n[Bước 5] Tiến hành xác minh kết quả E2E trong Mock Database...");

    const finalTask = db.crawler_tasks[0];
    const crawledPosts = db.crawled_posts;
    const logs = db.crawler_logs;

    console.log(` - Trạng thái Task cuối cùng: ${finalTask.status} (Kỳ vọng: completed)`);
    console.log(` - Số bài viết cào được ghi nhận: ${crawledPosts.length} (Kỳ vọng: 1)`);
    
    if (crawledPosts.length > 0) {
      const post = crawledPosts[0];
      console.log(`   + Nội dung bài viết: "${post.caption}"`);
      console.log(`   + Danh sách Tags (đã gộp):`, post.tags);
      console.log(`   + Ngôn ngữ bài viết (thừa kế): ${post.language}`);

      // Kiểm tra tính hợp lệ
      const isTaskCompleted = finalTask.status === "completed";
      const hasCampaignTag = post.tags.includes("frontend_campaign_tag");
      const hasAutumnSalesTag = post.tags.includes("autumn_sales");
      const hasPostOriginalTag = post.tags.includes("post_tag");
      const isLanguageVi = post.language === "vi";
      const hasLogSaved = logs.length > 0 && logs[0].task_id === finalTask.id;

      if (isTaskCompleted && hasCampaignTag && hasAutumnSalesTag && hasPostOriginalTag && isLanguageVi && hasLogSaved) {
        console.log("\n🎉 KẾT QUẢ: KIỂM THỬ E2E THÀNH CÔNG RỰC RỠ! (FRONTEND -> WORKER -> DB Dữ liệu chuẩn xác!)");
      } else {
        console.error("\n❌ KẾT QUẢ: KIỂM THỬ THẤT BẠI! Dữ liệu không khớp kỳ vọng.");
        console.error(`  - isTaskCompleted: ${isTaskCompleted}`);
        console.error(`  - hasCampaignTag: ${hasCampaignTag}`);
        console.error(`  - hasAutumnSalesTag: ${hasAutumnSalesTag}`);
        console.error(`  - hasPostOriginalTag: ${hasPostOriginalTag}`);
        console.error(`  - isLanguageVi: ${isLanguageVi}`);
        console.error(`  - hasLogSaved: ${hasLogSaved}`);
      }
    } else {
      console.error("\n❌ KẾT QUẢ: KIỂM THỬ THẤT BẠI! Không ghi nhận bài viết nào trong DB.");
    }

  } catch (error: any) {
    console.error("\n❌ LỖI NGHIÊM TRỌNG TRONG QUÁ TRÌNH TEST:", error.message);
  } finally {
    // Dọn dẹp Mocking
    CrawlerFactory.create = originalCreate;
    globalThis.fetch = originalFetch;
    console.log("\n=== HOÀN THÀNH TIẾN TRÌNH KIỂM THỬ ===");
  }
}

// Chạy test E2E
runE2ETest();
