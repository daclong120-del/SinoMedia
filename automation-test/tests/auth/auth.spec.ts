import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ConfigReader } from '../../src/utils/ConfigReader';

// Override storageState rỗng để ép chạy với cấu hình chưa đăng nhập
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication and Access Control @ui @auth', () => {
  const systemUrl = ConfigReader.baseUrl;
  const email = ConfigReader.testUserEmail;
  const password = ConfigReader.testUserPassword;

  test('TC_AUTH_001 - Đăng nhập thành công với tài khoản kiểm thử hợp lệ @auth @ui', async ({ page }) => {
    const loginPage = new LoginPage(page);
    console.log(`TC_AUTH_001: Đăng nhập với tài khoản: ${email}`);
    await loginPage.goto(systemUrl);
    await loginPage.login(email, password);

    // Xác nhận đã điều hướng vào trang Dashboard chính thành công
    await expect(page).toHaveURL(new RegExp('.*/dash.*'));
    console.log('TC_AUTH_001: Đăng nhập và chuyển hướng dashboard thành công (PASS)');
  });

  test('TC_AUTH_002 - Chặn truy cập trái phép và redirect về login khi chưa xác thực @auth @ui', async ({ page }) => {
    console.log(`TC_AUTH_002: Thử truy cập trực tiếp /dash/tasks khi chưa đăng nhập`);
    await page.goto(`${systemUrl}/dash/tasks`);
    await page.waitForLoadState('networkidle');

    // Kỳ vọng: Next.js middleware chặn và tự động chuyển hướng về trang /login
    await expect(page).toHaveURL(new RegExp('.*/login.*'));
    console.log('TC_AUTH_002: Chặn truy cập trái phép và redirect về login thành công (PASS)');
  });
});
