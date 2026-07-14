import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigReader } from '../src/utils/ConfigReader';

test('Explore SinoMedia Dashboard and Generate Requirement Spec', async ({ page }) => {
  const evidenceDir = path.resolve(__dirname, '../evidence/requirements');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const systemUrl = ConfigReader.baseUrl;
  const email = ConfigReader.testUserEmail;
  const password = ConfigReader.testUserPassword;

  console.log(`Đang truy cập: ${systemUrl}/login`);
  await page.goto(`${systemUrl}/login`);
  await page.waitForSelector('input[placeholder="name@example.com"]');

  // Chụp ảnh màn hình trang login
  await page.screenshot({ path: path.join(evidenceDir, 'login_page.png') });
  console.log('Đã chụp ảnh màn hình trang login.');

  // Điền thông tin đăng nhập bằng các selector chính xác
  console.log(`Đang nhập tài khoản: ${email}`);
  await page.fill('input[placeholder="name@example.com"]', email);
  await page.fill('input[placeholder="••••••••"]', password);

  // Chụp ảnh trước khi nhấn login
  await page.screenshot({ path: path.join(evidenceDir, 'login_filled.png') });

  // Nhấn nút login (nút có text Sign in hoặc Đăng nhập)
  console.log('Đang nhấn nút đăng nhập...');
  await page.click('button[type="submit"]');

  // Đợi chuyển trang (đến trang dashboard home)
  console.log('Đang chờ chuyển trang đến dashboard...');
  await page.waitForURL('**/dash/**', { timeout: 15000 });
  await page.waitForSelector('text=Tổng quan');

  // Chuyển trực tiếp sang trang tasks để quét DOM
  console.log('Điều hướng đến trang quản lý tasks: /dash/tasks');
  await page.goto(`${systemUrl}/dash/tasks`);
  await page.waitForSelector('text=Chiến dịch & Nhiệm vụ cào');

  // Chụp ảnh màn hình trang quản lý tasks
  await page.screenshot({ path: path.join(evidenceDir, 'dash_tasks_page.png'), fullPage: true });
  console.log('Đã chụp ảnh màn hình trang quản lý tasks.');

  // Quét DOM của trang tasks để tìm các phần tử tương tác
  const elements = await page.evaluate(() => {
    const list: any[] = [];
    // Quét buttons
    document.querySelectorAll('button').forEach(btn => {
      list.push({
        type: 'button',
        text: btn.innerText.trim(),
        id: btn.id,
        className: btn.className,
        disabled: btn.disabled,
      });
    });
    // Quét inputs
    document.querySelectorAll('input, select, textarea').forEach((el: any) => {
      list.push({
        type: el.tagName.toLowerCase(),
        name: el.name,
        id: el.id,
        placeholder: el.placeholder || '',
        value: el.value,
      });
    });
    // Quét tables
    document.querySelectorAll('table').forEach((tbl: any) => {
      list.push({
        type: 'table',
        headers: Array.from(tbl.querySelectorAll('th')).map((th: any) => th.innerText.trim()),
        rowsCount: tbl.querySelectorAll('tr').length,
      });
    });
    return list;
  });

  // Ghi kết quả quét DOM ra file json
  const domDumpPath = path.resolve(__dirname, '../evidence/requirements/dom_dump.json');
  fs.writeFileSync(domDumpPath, JSON.stringify(elements, null, 2), 'utf-8');
  console.log(`Đã lưu kết quả quét DOM vào ${domDumpPath}`);
});
