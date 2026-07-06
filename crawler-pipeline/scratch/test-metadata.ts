/**
 * @fileoverview Test Script for Crawler Task Metadata
 * Verifies that the queue worker parses metadata, sets environment variables,
 * and the database writer merges tags and inherits the language correctly.
 * 
 * Uses global fetch mocking to run fully isolated without database connectivity.
 */

import { CONFIG } from "../src/config.js";
import { executeTask } from "../src/queue_worker.js";
import { CrawlerFactory } from "../src/crawl/crawler_factory.js";
import type { ICrawler } from "../src/base/base_crawler.js";
import type { CrawlerTask } from "../src/model/storage.js";

// Mảng lưu trữ các payload POST được gửi qua REST API
const mockDatabasePosts: any[] = [];

// Monkey-patch globalThis.fetch để bẫy toàn bộ request Supabase REST
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input.toString();

  // Bẫy request ghi/đọc/xóa bảng crawled_posts
  if (url.includes("/rest/v1/crawled_posts")) {
    const method = init?.method || "GET";
    
    if (method === "POST") {
      const body = JSON.parse(init?.body as string);
      
      // Xử lý cả dạng mảng (Bulk) và dạng đơn lẻ
      if (Array.isArray(body)) {
        mockDatabasePosts.push(...body);
      } else {
        mockDatabasePosts.push(body);
      }
      
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "GET") {
      return new Response(JSON.stringify(mockDatabasePosts), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      mockDatabasePosts.length = 0; // Clear mock DB
      return new Response(null, { status: 204 });
    }
  }

  // Bẫy các request ghi log (crawler_logs) hoặc cập nhật status (crawler_tasks)
  if (url.includes("/rest/v1/crawler_logs") || url.includes("/rest/v1/crawler_tasks")) {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return originalFetch(input, init);
};

// Khởi tạo Mock Crawler giả lập cào dữ liệu và gọi upsertPost
class MockCrawler implements ICrawler {
  async start() {}
  async launchBrowser() {}
  async closeBrowser() {}
  async crawl(target: string) {
    console.log("[Mock Crawler] Executing crawl task...");
    
    const { upsertPost } = await import("../src/store/supabase_writer.js");
    await upsertPost({
      platform: "mock",
      platform_id: "post_metadata_test_123",
      caption: "This is a mock post to test task metadata inheritance",
      tags: ["post_tag"], // Tag gốc của post
      language: "auto",
    });
  }
  async creator(target: string) {}
  async search(target: string, max: number) {}
  async comments(target: string, max: number) {}
}

async function runTest() {
  console.log("=== STARTING CRAWLER TASK METADATA E2E TEST (FULLY MOCKED) ===");

  // 1. Ghi đè CrawlerFactory để trả về MockCrawler khi gọi platform "mock"
  const originalCreate = CrawlerFactory.create;
  CrawlerFactory.create = (platform: string): ICrawler => {
    if (platform === "mock") {
      return new MockCrawler();
    }
    return originalCreate(platform);
  };

  // 2. Định nghĩa mock task có chứa metadata cấu hình
  const mockTask: CrawlerTask = {
    id: "test-task-uuid-9999",
    platform: "mock",
    command: "crawl",
    target: "mock_user_channel",
    status: "pending",
    metadata: {
      tags: ["mother_tag_1", "mother_tag_2"],
      language: "en",
      headless: false,
      crawl_comments: true,
      upload_r2: false,
    },
  };

  try {
    // 3. Thực thi task qua Queue Worker logic
    console.log("\n[Test] Running executeTask with mockTask...");
    
    // Check environment variables during execution
    const checkInterval = setInterval(() => {
      if (process.env.CURRENT_TASK_TAGS) {
        console.log("\n[Verification 1] Environment variables during run:");
        console.log(" - CURRENT_TASK_TAGS:", process.env.CURRENT_TASK_TAGS);
        console.log(" - CURRENT_TASK_LANGUAGE:", process.env.CURRENT_TASK_LANGUAGE);
        console.log(" - ENABLE_GET_COMMENTS:", process.env.ENABLE_GET_COMMENTS);
        console.log(" - ENABLE_UPLOAD_R2:", process.env.ENABLE_UPLOAD_R2);
        clearInterval(checkInterval);
      }
    }, 50);

    await executeTask(mockTask);
    clearInterval(checkInterval);

    console.log("\n[Verification 2] Environment variables cleaned up after run:");
    console.log(" - CURRENT_TASK_TAGS:", process.env.CURRENT_TASK_TAGS ?? "undefined (Success)");
    console.log(" - CURRENT_TASK_LANGUAGE:", process.env.CURRENT_TASK_LANGUAGE ?? "undefined (Success)");

    // 4. Kiểm tra xem Mock DB đã nhận đúng post với tags & language đã merge chưa
    console.log("\n[Test] Verifying crawled post properties in mock database...");
    
    if (mockDatabasePosts.length > 0) {
      const testPost = mockDatabasePosts[0];
      console.log("\n[Verification 3] Crawled Post data captured:");
      console.log(" - Platform:", testPost.platform);
      console.log(" - Platform ID:", testPost.platform_id);
      console.log(" - Tags (Merged):", testPost.tags);
      console.log(" - Language (Inherited):", testPost.language);

      // Assertions
      const hasMotherTag1 = testPost.tags.includes("mother_tag_1");
      const hasMotherTag2 = testPost.tags.includes("mother_tag_2");
      const hasPostTag = testPost.tags.includes("post_tag");
      const isLangCorrect = testPost.language === "en";

      if (hasMotherTag1 && hasMotherTag2 && hasPostTag && isLangCorrect) {
        console.log("\n✅ RESULT: TEST PASSED (All metadata properly inherited and database updated!)");
      } else {
        console.error("\n❌ RESULT: TEST FAILED (Metadata mismatched)");
      }
    } else {
      console.error("\n❌ RESULT: TEST FAILED (No post captured in mock DB)");
    }

  } catch (error: any) {
    console.error("\n❌ Fatal Error during test execution:", error.message);
  } finally {
    // Khôi phục
    CrawlerFactory.create = originalCreate;
    globalThis.fetch = originalFetch;
    console.log("\n=== TEST PROCESS COMPLETED ===");
  }
}

runTest();
