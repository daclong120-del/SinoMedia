import { loadBilibiliCookie, setBilibiliCookie, pong } from "../src/crawl/bilibili/client.js";
import { BilibiliCrawler } from "../src/crawl/bilibili/core.js";
import { supabaseRest } from "../src/store/supabase_client.js";
import { CONFIG } from "../src/config.js";

// Helper để in kết quả test
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log("==========================================");
  console.log("BẮT ĐẦU CHẠY KIỂM THỬ CRAWLER & COOKIE FORMAT");
  console.log("==========================================");

  // ----------------------------------------------------
  // TEST 1: Kiểm thử formatCookie (JSON array / JSON object / string thô)
  // ----------------------------------------------------
  console.log("\n[Test 1] Kiểm tra formatCookie...");

  // Case A: Cookie JSON Array (EditThisCookie export)
  const jsonArrayCookie = `[
    {"name": "SESSDATA", "value": "my_sessdata_val"},
    {"name": "bili_jct", "value": "my_jct_val"}
  ]`;
  setBilibiliCookie(jsonArrayCookie);
  const formattedArray = await loadBilibiliCookie();
  assert(
    formattedArray.includes("SESSDATA=my_sessdata_val") && formattedArray.includes("bili_jct=my_jct_val"),
    "Chuẩn hóa JSON Array Cookie thành công!"
  );

  // Case B: Cookie JSON Object
  const jsonObjectCookie = `{"SESSDATA": "obj_sess_val", "bili_jct": "obj_jct_val"}`;
  setBilibiliCookie(jsonObjectCookie);
  const formattedObj = await loadBilibiliCookie();
  assert(
    formattedObj.includes("SESSDATA=obj_sess_val") && formattedObj.includes("bili_jct=obj_jct_val"),
    "Chuẩn hóa JSON Object Cookie thành công!"
  );

  // Case C: Cookie bị bọc trong dấu nháy kép thừa
  const escapedCookie = `"SESSDATA=escaped_val; bili_jct=escaped_jct"`;
  setBilibiliCookie(escapedCookie);
  const formattedEscaped = await loadBilibiliCookie();
  assert(
    formattedEscaped === "SESSDATA=escaped_val; bili_jct=escaped_jct",
    "Loại bỏ dấu nháy kép thừa thành công!"
  );

  // Case D: Cookie string thô thông thường
  const rawCookie = "SESSDATA=raw_val; bili_jct=raw_jct";
  setBilibiliCookie(rawCookie);
  const formattedRaw = await loadBilibiliCookie();
  assert(formattedRaw === rawCookie, "Giữ nguyên Cookie thô thông thường thành công!");

  // Reset cookie tạm thời
  setBilibiliCookie("");

  // ----------------------------------------------------
  // TEST 2: Kiểm tra database connection & nạp tài khoản active haha
  // ----------------------------------------------------
  console.log("\n[Test 2] Kiểm tra tài khoản trong database...");
  const accounts = await supabaseRest("crawler_accounts", {
    method: "GET",
    params: {
      platform: "eq.bilibili",
      status: "eq.active",
      order: "last_used_at.asc.nullsfirst",
      limit: "1"
    }
  });

  assert(accounts && accounts.length > 0, "Tìm thấy ít nhất 1 tài khoản active trong Supabase!");
  const activeAcc = accounts[0];
  console.log(`Tài khoản active được chọn test: ${activeAcc.username}`);

  // Test pong() thực tế với cookie của tài khoản haha
  setBilibiliCookie(activeAcc.cookie_data);
  const isBilibiliSessionActive = await pong();
  console.log(`Kết quả kiểm tra đăng nhập Bilibili thật: ${isBilibiliSessionActive}`);
  setBilibiliCookie(""); // Reset

  // ----------------------------------------------------
  // TEST 3: Chạy cào Search trực tiếp bằng BilibiliCrawler
  // ----------------------------------------------------
  console.log("\n[Test 3] Chạy thử BilibiliCrawler.search trực tiếp...");
  const crawler = new BilibiliCrawler();
  try {
    // Chạy cào thử 1 video với từ khóa "test"
    await crawler.search("test", 1);
    console.log("[PASS] BilibiliCrawler.search chạy không gặp lỗi!");
  } catch (err: any) {
    console.error(`[FAIL] BilibiliCrawler.search ném ra lỗi: ${err.message}`);
    process.exit(1);
  }

  console.log("\n==========================================");
  console.log("HOÀN TẤT TẤT CẢ CÁC KIỂM THỬ: THÀNH CÔNG 100%");
  console.log("==========================================");
}

runTests();
