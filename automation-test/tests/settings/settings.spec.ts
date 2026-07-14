import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { ConfigReader } from '../../src/utils/ConfigReader';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Settings and Configurations Security @ui @settings', () => {
  const systemUrl = ConfigReader.baseUrl;

  test.beforeEach(async ({ page }) => {
    // Đã đăng nhập sẵn qua storageState
  });

  test('TC_SET_001 - Bảo mật thông tin cấu hình nhạy cảm (API Key được masking) @settings @ui', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    console.log('TC_SET_001: Điều hướng tới trang settings /dash/settings');
    await settingsPage.goto(systemUrl);

    // Xác nhận trường API Key đã được masking bảo mật
    const isMasked = await settingsPage.isApiKeyMasked();
    expect(isMasked).toBe(true);

    console.log('TC_SET_001: Khóa API được bảo mật thành công (PASS)');
  });
});
