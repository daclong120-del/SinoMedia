import { test, expect } from '@playwright/test';
import { ConfigReader } from '../../src/utils/ConfigReader';

test.describe('Crawler Accounts Management @ui @accounts', () => {
  const systemUrl = ConfigReader.baseUrl;

  test('TC_ACCOUNT_001 - Hiển thị danh sách tài khoản crawler @accounts @ui', async ({ page }) => {
    // Session admin đã được nạp sẵn qua storageState
    console.log('TC_ACCOUNT_001: Điều hướng tới trang quản lý tài khoản /dash/accounts');
    await page.goto(`${systemUrl}/dash/accounts`);
    await page.waitForLoadState('networkidle');

    // Xác nhận tiêu đề trang hiển thị
    const heading = page.getByRole('heading', { name: /Quản lý tài khoản/i }).first();
    await expect(heading).toBeVisible();

    // Xác nhận bảng hiển thị
    const accountsTable = page.locator('table').first();
    await expect(accountsTable).toBeVisible();

    // Xác nhận có dòng tiêu đề cột
    const tableHeader = accountsTable.locator('thead tr');
    await expect(tableHeader).toBeVisible();
    console.log('TC_ACCOUNT_001: Danh sách tài khoản hiển thị thành công (PASS)');
  });

  test('TC_ACCOUNT_002 - Hiển thị form nạp tài khoản mới khi click nút Nạp tài khoản mới @accounts @ui', async ({ page }) => {
    console.log('TC_ACCOUNT_002: Điều hướng tới trang quản lý tài khoản /dash/accounts');
    await page.goto(`${systemUrl}/dash/accounts`);
    await page.waitForLoadState('networkidle');

    // Click nút "Nạp tài khoản mới"
    const addAccountButton = page.getByRole('button', { name: /Nạp tài khoản/i }).first();
    await expect(addAccountButton).toBeVisible();
    await addAccountButton.click();

    // Xác nhận modal hiển thị (sử dụng regex tránh từ nhạy cảm)
    const modalHeader = page.getByRole('heading', { name: /Nạp tài khoản/i }).first();
    await expect(modalHeader).toBeVisible();
    console.log('TC_ACCOUNT_002: Modal nạp tài khoản hiển thị thành công (PASS)');
  });
});
