import { test, expect } from '@playwright/test';
import { ConfigReader } from '../../src/utils/ConfigReader';

test.describe('Proxy Pool Management @ui @proxies', () => {
  const systemUrl = ConfigReader.baseUrl;

  test('TC_PROXY_001 - Hiển thị danh sách proxy trong pool @proxies @ui', async ({ page }) => {
    // Session admin đã được nạp sẵn qua storageState
    console.log('TC_PROXY_001: Điều hướng tới trang quản lý proxy /dash/proxies');
    await page.goto(`${systemUrl}/dash/proxies`);
    await page.waitForLoadState('networkidle');

    // Xác nhận tiêu đề trang hiển thị
    const heading = page.getByRole('heading', { name: /Quản lý Proxy/i }).first();
    await expect(heading).toBeVisible();

    // Xác nhận bảng danh sách proxy hiển thị
    const proxiesTable = page.locator('table').first();
    await expect(proxiesTable).toBeVisible();
    console.log('TC_PROXY_001: Danh sách proxy hiển thị thành công (PASS)');
  });

  test('TC_PROXY_002 - Hiển thị form nạp proxy mới khi click nút Nạp Proxy @proxies @ui', async ({ page }) => {
    console.log('TC_PROXY_002: Điều hướng tới trang quản lý proxy /dash/proxies');
    await page.goto(`${systemUrl}/dash/proxies`);
    await page.waitForLoadState('networkidle');

    // Click nút "Nạp Proxy"
    const addProxyButton = page.getByRole('button', { name: /Nạp Proxy/i }).first();
    await expect(addProxyButton).toBeVisible();
    await addProxyButton.click();

    // Xác nhận modal "Nạp Proxy mới" hiển thị
    const modalHeader = page.getByRole('heading', { name: /Nạp Proxy mới/i }).first();
    await expect(modalHeader).toBeVisible();
    console.log('TC_PROXY_002: Modal nạp proxy hiển thị thành công (PASS)');
  });
});
