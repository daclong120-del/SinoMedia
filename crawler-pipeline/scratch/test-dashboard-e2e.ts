import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Tự đọc env giống script trước vì config.ts ở crawler pipeline gặp lỗi require() stack trace
function parseEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    if (line.trim() && !line.startsWith('#')) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        let val = parts.slice(1).join('=').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[parts[0].trim()] = val;
      }
    }
  }
  return env;
}
const env = { ...parseEnv('../.env'), ...parseEnv('../supabase/.env.local'), ...process.env };
const adminEmail = env.TEST_ADMIN_EMAIL;
const userEmail = env.TEST_USER_EMAIL;
const pass = env.TEST_ADMIN_PASSWORD;

if (!adminEmail || !userEmail || !pass) {
  console.error("Thiếu TEST_ADMIN_EMAIL, TEST_USER_EMAIL, hoặc TEST_ADMIN_PASSWORD");
  process.exit(1);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  console.log("--- Bắt đầu Smoke Test Dashboard ---");

  // TEST 1: Admin Login
  console.log("1. Test Admin Login...");
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  
  await adminPage.goto('http://localhost:3000/login');
  await adminPage.fill('[placeholder="name@example.com"]', adminEmail);
  await adminPage.fill('[placeholder="••••••••"]', pass);
  await adminPage.click('button[type="submit"]');
  
  await adminPage.waitForURL('**/dash/home');
  console.log("  ✅ Admin đăng nhập thành công!");

  // Test admin truy cập admin-only surfaces
  const adminRoutes = [
    '/dash/accounts',
    '/dash/tasks',
    '/dash/manage-account/members'
  ];

  for (const route of adminRoutes) {
    const res = await adminPage.goto(`http://localhost:3000${route}`);
    if (res?.ok() && !adminPage.url().includes('error=')) {
      console.log(`  ✅ Admin truy cập ${route} thành công.`);
    } else {
      console.log(`  ❌ Admin truy cập ${route} thất bại!`);
      process.exit(1);
    }
  }

  // TEST 2: User Login
  console.log("2. Test User Login...");
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  
  await userPage.goto('http://localhost:3000/login');
  await userPage.fill('[placeholder="name@example.com"]', userEmail);
  await userPage.fill('[placeholder="••••••••"]', pass);
  await userPage.click('button[type="submit"]');
  
  await userPage.waitForURL('**/dash/home');
  console.log("  ✅ User đăng nhập thành công!");

  // Test user truy cập admin-only surfaces (kỳ vọng bị redirect hoặc báo lỗi)
  for (const route of adminRoutes) {
    const res = await userPage.goto(`http://localhost:3000${route}`);
    // Middleware của Next.js cho admin-only routes sẽ đẩy về /dash/home?error=unauthorized
    await userPage.waitForLoadState('networkidle');
    const url = userPage.url();
    if (url.includes('error=unauthorized') || url === 'http://localhost:3000/dash/home') {
      console.log(`  ✅ User bị chặn truy cập ${route} đúng theo kỳ vọng (chuyển hướng).`);
    } else if (!res?.ok()) {
      console.log(`  ✅ User bị chặn truy cập ${route} đúng theo kỳ vọng (trả về lỗi HTTP ${res?.status()}).`);
    } else {
      console.log(`  ❌ LỖI: User CÓ THỂ truy cập ${route}! URL hiện tại: ${url}`);
      process.exit(1);
    }
  }

  console.log("🎉 TOÀN BỘ SMOKE TEST DASHBOARD ĐẠT YÊU CẦU!");
  await browser.close();
}

run().catch(console.error);
