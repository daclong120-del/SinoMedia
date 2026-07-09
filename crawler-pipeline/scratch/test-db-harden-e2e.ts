import { CONFIG } from "../src/config.js";
import { logger } from "../src/utils/index.js";

async function testHardenE2E() {
  logger.info("=== BẮT ĐẦU CHẠY KIỂM THỬ E2E BẢO MẬT DATABASE ===", "QA_TEST");

  const supabaseUrl = CONFIG.supabase.url;
  const serviceRoleKey = CONFIG.supabase.serviceRoleKey;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;
  const userEmail = process.env.TEST_USER_EMAIL;
  const userPassword = process.env.TEST_USER_PASSWORD;

  if (!anonKey) {
    logger.error("Không tìm thấy Supabase anon key trong các biến môi trường!", "QA_TEST");
    process.exit(1);
  }

  if (!adminEmail || !adminPassword || !userEmail || !userPassword) {
    logger.error("Thiếu biến môi trường tài khoản test (TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_USER_EMAIL, TEST_USER_PASSWORD)!", "QA_TEST");
    process.exit(1);
  }

  let success = true;

  // 1. Kiểm thử 1: Truy vấn qua Anon Key (Kỳ vọng: Bị chặn - Lỗi 42501)
  logger.info("--------------------------------------------------", "QA_TEST");
  logger.info("1. Kiểm thử truy vấn dữ liệu thô bằng Anon Key (Fail-Closed)...", "QA_TEST");
  const tablesToTestAnon = [
    "crawled_posts",
    "crawled_authors",
    "crawled_comments",
    "creative_advertisers",
    "creative_ads",
    "post_metric_snapshots",
    "author_metric_snapshots",
    "exported_files",
    "crawler_tasks",
    "crawler_logs",
    "profiles",
    "workspaces",
    "team_roles",
    "team_role_permissions",
    "team_members",
    "crawler_accounts",
    "crawler_proxies",
    "api_tokens",
    "team_invitations",
    "audit_logs"
  ];
  for (const tableName of tablesToTestAnon) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=1`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`
        }
      });
      const status = res.status;
      const body = await res.json() as any;
      
      if (status === 401 || status === 403 || body.code === "42501") {
        logger.info(`   ✅ Bảng '${tableName}': Bị chặn thành công (HTTP ${status}, Code: ${body.code})`, "QA_TEST");
      } else {
        logger.error(`   ❌ THẤT BẠI: Bảng '${tableName}' không bị chặn cho Anon! Status: ${status}, Body: ${JSON.stringify(body)}`, "QA_TEST");
        success = false;
      }
    } catch (err: any) {
      logger.error(`   ❌ Lỗi kết nối kiểm thử 1 trên bảng '${tableName}': ${err.message}`, "QA_TEST");
      success = false;
    }
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
    if (process.env.E2E_AUTO_SIGNUP === 'true') {
      try {
        const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: "POST",
          headers: {
            apikey: anonKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword
          })
        });
        if (signupRes.ok) {
          logger.info(` -> Tạo tài khoản ${adminEmail} thành công!`, "QA_TEST");
        }
      } catch (e) {
        // Bỏ qua lỗi nếu user đã tồn tại
      }
    }

    // 3.1. Đăng nhập qua Supabase Auth để lấy access_token
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });

    if (!authRes.ok) {
      throw new Error(`Đăng nhập thất bại: ${authRes.status} ${await authRes.text()}`);
    }

    const authData = await authRes.json() as any;
    const userToken = authData.access_token;
    logger.info(" -> Đăng nhập thành công! Đang thực hiện truy vấn bằng JWT token...", "QA_TEST");

    // 3.2. Truy vấn bằng token của user (admin) trên toàn bộ các bảng
    const tablesToTest = [
      "crawled_posts",
      "crawled_authors",
      "crawled_comments",
      "creative_advertisers",
      "creative_ads",
      "post_metric_snapshots",
      "author_metric_snapshots",
      "exported_files",
      "crawler_tasks",
      "crawler_logs",
      "profiles",
      "workspaces",
      "team_roles",
      "team_role_permissions",
      "team_members",
      "crawler_accounts",
      "crawler_proxies",
      "api_tokens",
      "team_invitations",
      "audit_logs"
    ];

    logger.info(" -> Kiểm tra quyền SELECT cho admin trên tất cả các bảng...", "QA_TEST");
    for (const tableName of tablesToTest) {
      const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=1`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${userToken}`
        }
      });
      const status = res.status;
      const body = await res.json() as any;
      if (status === 200) {
        logger.info(`   ✅ Bảng '${tableName}': OK (HTTP 200)`, "QA_TEST");
      } else {
        logger.error(`   ❌ Bảng '${tableName}': THẤT BẠI! Status: ${status}, Body: ${JSON.stringify(body)}`, "QA_TEST");
        success = false;
      }
    }
  } catch (err: any) {
    logger.error(`❌ Lỗi kết nối kiểm thử 3: ${err.message}`, "QA_TEST");
    success = false;
  }

  // 4. Kiểm thử 4: Đăng nhập bằng tài khoản role "user" (Kỳ vọng: Bị chặn hoặc trả rỗng)
  logger.info("--------------------------------------------------", "QA_TEST");
  logger.info("4. Đăng nhập bằng tài khoản role user & kiểm thử truy vấn bảng nhạy cảm...", "QA_TEST");
  try {
    if (process.env.E2E_AUTO_SIGNUP === 'true') {
      try {
        const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: "POST",
          headers: {
            apikey: anonKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: userEmail,
            password: userPassword
          })
        });
        if (signupRes.ok) {
          logger.info(` -> Tạo tài khoản ${userEmail} thành công!`, "QA_TEST");
        }
      } catch (e) {
        // Bỏ qua lỗi nếu user đã tồn tại
      }
    }

    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: userEmail,
        password: userPassword
      })
    });

    if (!authRes.ok) {
      throw new Error(`Đăng nhập thất bại: ${authRes.status} ${await authRes.text()}`);
    }

    const authData = await authRes.json() as any;
    const normalUserToken = authData.access_token;
    logger.info(" -> Đăng nhập user@sinomedia.vn thành công! Đang thực hiện truy vấn bằng JWT token...", "QA_TEST");

    const sensitiveTables = [
      "api_tokens",
      "crawler_accounts",
      "audit_logs",
      "team_members"
    ];

    logger.info(" -> Kiểm tra quyền SELECT cho user thường trên các bảng nhạy cảm (kỳ vọng trả rỗng [])...", "QA_TEST");
    for (const tableName of sensitiveTables) {
      const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=1`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${normalUserToken}`
        }
      });
      const status = res.status;
      const body = await res.json() as any;
      
      // Thành công là khi không fetch được data (status = 401/403) hoặc trả về array rỗng (do RLS policy false)
      // HOẶC đối với team_members, user chỉ nhìn thấy bản ghi của chính họ (1 row, role_id='user') thay vì nhìn thấy toàn bộ admin
      if (
        status === 401 || 
        status === 403 || 
        status === 42501 || 
        (status === 200 && Array.isArray(body) && body.length === 0) ||
        (status === 200 && tableName === 'team_members' && Array.isArray(body) && body.length === 1 && body[0].role_id === 'user')
      ) {
        logger.info(`   ✅ Bảng '${tableName}': OK (Bị chặn, trả rỗng, hoặc chỉ thấy bản thân. Status: ${status}, Data length: ${body.length || 0})`, "QA_TEST");
      } else {
        logger.error(`   ❌ Bảng '${tableName}': THẤT BẠI (User thường lấy được dữ liệu không hợp lệ)! Status: ${status}, Data: ${JSON.stringify(body)}`, "QA_TEST");
        success = false;
      }
    }
  } catch (err: any) {
    logger.error(`❌ Lỗi kết nối kiểm thử 4: ${err.message}`, "QA_TEST");
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
