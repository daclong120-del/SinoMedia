import { CONFIG } from "../src/config.js";
import { logger } from "../src/utils/index.js";

async function testHardenE2E() {
  logger.info("=== BẮT ĐẦU CHẠY KIỂM THỬ E2E BẢO MẬT DATABASE ===", "QA_TEST");

  const supabaseUrl = CONFIG.supabase.url;
  const serviceRoleKey = CONFIG.supabase.serviceRoleKey;
  // Đọc anon key từ root env
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    logger.error("Không tìm thấy Supabase anon key trong các biến môi trường!", "QA_TEST");
    process.exit(1);
  }

  let success = true;

  // 1. Kiểm thử 1: Truy vấn qua Anon Key (Kỳ vọng: Bị chặn - Lỗi 42501)
  logger.info("--------------------------------------------------", "QA_TEST");
  logger.info("1. Kiểm thử truy vấn dữ liệu thô bằng Anon Key...", "QA_TEST");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/crawled_posts?limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });
    const status = res.status;
    const body = await res.json() as any;
    
    if (status === 401 || status === 403 || body.code === "42501") {
      logger.info(`✅ ĐẠT YÊU CẦU: Truy cập bị từ chối thành công. Code: ${body.code}, Message: ${body.message}`, "QA_TEST");
    } else {
      logger.error(`❌ THẤT BẠI: Anon key có thể đọc dữ liệu! Status: ${status}, Body: ${JSON.stringify(body)}`, "QA_TEST");
      success = false;
    }
  } catch (err: any) {
    logger.error(`❌ Lỗi kết nối kiểm thử 1: ${err.message}`, "QA_TEST");
    success = false;
  }

  // 2. Kiểm thử 2: Truy vấn qua Service Role Key (Kỳ vọng: Cho phép - HTTP 200)
  logger.info("--------------------------------------------------", "QA_TEST");
  logger.info("2. Kiểm thử truy vấn bằng Service Role Key (dành cho Worker)...", "QA_TEST");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/crawled_posts?limit=1`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    });
    const status = res.status;
    const body = await res.json() as any;
    
    if (status === 200 && Array.isArray(body)) {
      logger.info(`✅ ĐẠT YÊU CẦU: Worker (service_role) đọc dữ liệu thành công.`, "QA_TEST");
    } else {
      logger.error(`❌ THẤT BẠI: Worker bị chặn! Status: ${status}, Body: ${JSON.stringify(body)}`, "QA_TEST");
      success = false;
    }
  } catch (err: any) {
    logger.error(`❌ Lỗi kết nối kiểm thử 2: ${err.message}`, "QA_TEST");
    success = false;
  }

  // 3. Kiểm thử 3: Đăng nhập bằng tài khoản thật và truy vấn bằng JWT User (Kỳ vọng: Cho phép - HTTP 200)
  logger.info("--------------------------------------------------", "QA_TEST");
  logger.info("3. Đăng nhập bằng tài khoản admin thật & kiểm thử truy vấn qua JWT session...", "QA_TEST");
  try {
    // 3.1. Đăng nhập qua Supabase Auth để lấy access_token
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "admin@sinomedia.vn",
        password: "12345678"
      })
    });

    if (!authRes.ok) {
      throw new Error(`Đăng nhập thất bại: ${authRes.status} ${await authRes.text()}`);
    }

    const authData = await authRes.json() as any;
    const userToken = authData.access_token;
    logger.info(" -> Đăng nhập thành công! Đang thực hiện truy vấn bằng JWT token...", "QA_TEST");

    // 3.2. Truy vấn bằng token của user
    const res = await fetch(`${supabaseUrl}/rest/v1/crawled_posts?limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${userToken}`
      }
    });
    const status = res.status;
    const body = await res.json() as any;

    if (status === 200 && Array.isArray(body)) {
      logger.info(`✅ ĐẠT YÊU CẦU: Người dùng đã đăng nhập (authenticated admin) đọc dữ liệu thành công.`, "QA_TEST");
    } else {
      logger.error(`❌ THẤT BẠI: Người dùng bị chặn! Status: ${status}, Body: ${JSON.stringify(body)}`, "QA_TEST");
      success = false;
    }
  } catch (err: any) {
    logger.error(`❌ Lỗi kết nối kiểm thử 3: ${err.message}`, "QA_TEST");
    success = false;
  }

  logger.info("--------------------------------------------------", "QA_TEST");
  if (success) {
    logger.info("🎉 KẾT QUẢ: TOÀN BỘ CÁC BÀI TEST E2E BẢO MẬT DATABASE ĐÃ ĐẠT 100% YÊU CẦU!", "QA_TEST");
    process.exit(0);
  } else {
    logger.error("❌ KẾT QUẢ: KIỂM THỬ THẤT BẠI!", "QA_TEST");
    process.exit(1);
  }
}

testHardenE2E().catch(err => {
  logger.error(`Lỗi chưa xử lý: ${err.message}`, "QA_TEST");
  process.exit(1);
});
