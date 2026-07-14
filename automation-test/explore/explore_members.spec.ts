import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigReader } from '../src/utils/ConfigReader';

test('Explore SinoMedia Members Page and Role Panel', async ({ page }) => {
  const evidenceDir = path.resolve(__dirname, '../evidence/requirements');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const systemUrl = ConfigReader.baseUrl;
  const email = ConfigReader.testUserEmail;
  const password = ConfigReader.testUserPassword;

  console.log(`Đang truy cập: ${systemUrl}/login`);
  await page.goto(`${systemUrl}/login`);
  await page.waitForLoadState('networkidle');

  console.log(`Đang nhập tài khoản: ${email}`);
  await page.fill('input[placeholder="name@example.com"]', email);
  await page.fill('input[placeholder="••••••••"]', password);
  await page.click('button[type="submit"]');

  console.log('Đang chờ chuyển trang đến dashboard...');
  await page.waitForURL('**/dash/**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Chuyển sang trang manage-account/members
  console.log('Điều hướng đến trang quản lý thành viên: /dash/manage-account/members');
  await page.goto(`${systemUrl}/dash/manage-account/members`);
  await page.waitForLoadState('networkidle');

  // Chụp ảnh màn hình trang quản lý thành viên
  await page.screenshot({ path: path.join(evidenceDir, 'members_page.png'), fullPage: true });
  console.log('Đã chụp ảnh màn hình trang quản lý thành viên.');

  // Thử chuyển sang tab Vai trò (nếu có tab, hoặc xem cấu trúc DOM của vai trò)
  // Let's dump all text of buttons to find the tab "Vai trò"
  const buttonsText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(btn => btn.innerText.trim());
  });
  console.log('Các button trên trang members:', buttonsText);

  // Click vào tab/nút "Vai trò" hoặc "Roles" nếu tìm thấy
  const roleTab = page.locator('button:has-text("Vai trò"), button:has-text("Roles"), button:has-text("Quyền hạn")').first();
  if (await roleTab.isVisible()) {
    console.log('Tìm thấy tab Vai trò, đang click...');
    await roleTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(evidenceDir, 'roles_tab.png'), fullPage: true });
  }

  // Quét các nút vai trò (ví dụ: Admin, User)
  const rolesList = await page.evaluate(() => {
    const list: any[] = [];
    document.querySelectorAll('div, button, span').forEach((el: any) => {
      const text = el.innerText?.trim();
      if (text === 'Admin' || text === 'User' || text === 'admin' || text === 'user') {
        list.push({
          tagName: el.tagName,
          text: text,
          className: el.className,
        });
      }
    });
    return list;
  });
  console.log('Các phần tử liên quan đến Admin/User:', rolesList);

  // Ghi DOM dump của tab vai trò vào thư mục evidence/requirements
  const content = await page.content();
  fs.writeFileSync(path.join(evidenceDir, 'members_page.html'), content, 'utf-8');
});
