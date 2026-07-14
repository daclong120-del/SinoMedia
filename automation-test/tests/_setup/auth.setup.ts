import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ConfigReader } from '../../src/utils/ConfigReader';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  console.log(`Setup: Đang đăng nhập tài khoản kiểm thử: ${ConfigReader.testUserEmail}`);
  await loginPage.goto(ConfigReader.baseUrl);
  await loginPage.login(ConfigReader.testUserEmail, ConfigReader.testUserPassword);
  await expect(page).toHaveURL(new RegExp('.*/dash.*'));
  
  // Lưu cookies/localStorage
  await page.context().storageState({ path: authFile });
  console.log('Setup: Đã lưu storageState thành công.');
});
