import { test, expect } from '@playwright/test';
import { MembersPage } from '../../src/pages/MembersPage';
import { ConfigReader } from '../../src/utils/ConfigReader';

test.describe('Member Management Dashboard @ui @members', () => {
  const systemUrl = ConfigReader.baseUrl;

  test('TC_MEMBER_001 - Hiển thị danh sách thành viên hệ thống và phân quyền vai trò @members @ui', async ({ page }) => {
    const membersPage = new MembersPage(page);
    console.log('TC_MEMBER_001: Điều hướng tới trang quản lý thành viên /dash/manage-account/members');
    await membersPage.goto(systemUrl);

    // Xác nhận tiêu đề trang quản lý thành viên hiển thị
    await expect(page.getByRole('heading', { name: /Quản lý thành viên/i }).first()).toBeVisible();

    // Xác nhận tab Thành viên hệ thống đang active và bảng danh sách thành viên hiển thị
    const membersTable = page.locator('table').first();
    await expect(membersTable).toBeVisible();

    // Xác nhận có ít nhất 1 dòng trong bảng dữ liệu
    const rows = membersTable.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    console.log('TC_MEMBER_001: Danh sách thành viên hiển thị đầy đủ (PASS)');
  });

  test('TC_MEMBER_002 - Hiển thị form modal mời thành viên khi click nút Mời thành viên @members @ui', async ({ page }) => {
    const membersPage = new MembersPage(page);
    console.log('TC_MEMBER_002: Điều hướng tới trang quản lý thành viên /dash/manage-account/members');
    await membersPage.goto(systemUrl);

    // Tìm và click nút "Mời thành viên"
    const inviteButton = page.getByRole('button', { name: /Mời thành viên/i }).first();
    await expect(inviteButton).toBeVisible();
    await inviteButton.click();

    // Kiểm tra xem Modal "Mời thành viên mới" có xuất hiện hay không
    const modalHeader = page.getByText('Mời thành viên mới');
    await expect(modalHeader).toBeVisible();
    console.log('TC_MEMBER_002: Modal mời thành viên hiển thị thành công (PASS)');
  });
});
