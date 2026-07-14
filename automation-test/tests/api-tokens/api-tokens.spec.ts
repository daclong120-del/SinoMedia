import { test, expect } from '@playwright/test';
import { MembersPage } from '../../src/pages/MembersPage';
import { ConfigReader } from '../../src/utils/ConfigReader';

test.describe('API Token Management @ui @api-tokens', () => {
  const systemUrl = ConfigReader.baseUrl;

  test('TC_TOKEN_001 - Di chuyển tới tab Khóa truy cập API và hiển thị danh sách API tokens @api-tokens @ui', async ({ page }) => {
    const membersPage = new MembersPage(page);
    console.log('TC_TOKEN_001: Điều hướng tới trang quản lý thành viên /dash/manage-account/members');
    await membersPage.goto(systemUrl);

    // Chuyển sang tab "Khóa truy cập API"
    const apiTokenTabButton = page.getByRole('button', { name: /Khóa truy cập API/i }).first();
    await expect(apiTokenTabButton).toBeVisible();
    await apiTokenTabButton.click();

    // Xác nhận panel chứa danh sách API token đã hiển thị
    const tokensHeader = page.getByRole('heading', { name: /API Access Tokens/i }).first();
    await expect(tokensHeader).toBeVisible();
    console.log('TC_TOKEN_001: Danh sách API tokens hiển thị thành công (PASS)');
  });

  test('TC_TOKEN_002 - Hiển thị form tạo API Token mới khi click nút Tạo Token mới @api-tokens @ui', async ({ page }) => {
    const membersPage = new MembersPage(page);
    console.log('TC_TOKEN_002: Điều hướng tới trang quản lý thành viên /dash/manage-account/members');
    await membersPage.goto(systemUrl);

    // Chuyển sang tab "Khóa truy cập API"
    const apiTokenTabButton = page.getByRole('button', { name: /Khóa truy cập API/i }).first();
    await expect(apiTokenTabButton).toBeVisible();
    await apiTokenTabButton.click();

    // Click nút "Tạo Token mới"
    const createTokenButton = page.getByRole('button', { name: /Tạo Token mới/i }).first();
    await expect(createTokenButton).toBeVisible();
    await createTokenButton.click();

    // Xác nhận modal "Tạo API Token mới" hiển thị
    const modalHeader = page.getByRole('heading', { name: /Tạo API Token mới/i }).first();
    await expect(modalHeader).toBeVisible();
    console.log('TC_TOKEN_002: Form tạo API Token mới hiển thị thành công (PASS)');
  });
});
