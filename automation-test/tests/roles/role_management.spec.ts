import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { MembersPage } from '../../src/pages/MembersPage';
import { ConfigReader } from '../../src/utils/ConfigReader';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Role Management UI - Deletion Protection @ui @role', () => {
  const systemUrl = ConfigReader.baseUrl;

  test.beforeEach(async ({ page }) => {
    // Không cần login thủ công, storageState đã nạp session đăng nhập sẵn
  });

  test('TC_ROLE_001 - Chặn xóa vai trò mặc định "admin" trên UI @role @ui', async ({ page }) => {
    const membersPage = new MembersPage(page);
    console.log('TC_ROLE_001: Điều hướng tới trang quản lý thành viên /dash/manage-account/members');
    await membersPage.goto(systemUrl);

    console.log('TC_ROLE_001: Bấm chuyển sang tab "Vai trò & Quyền hạn"');
    await membersPage.clickRolesTab();

    console.log('TC_ROLE_001: Chọn vai trò "Admin"');
    await membersPage.selectAdminRole();

    console.log('TC_ROLE_001: Xác minh nút "Xóa vai trò" không hiển thị (bị ẩn)');
    const isDeleteVisible = await membersPage.isDeleteButtonVisible();
    expect(isDeleteVisible).toBe(false);

    console.log('TC_ROLE_001: Vai trò "admin" đã được bảo vệ thành công trên UI (PASS)');
  });

  test('TC_ROLE_002 - Chặn xóa vai trò mặc định "user" trên UI @role @ui', async ({ page }) => {
    const membersPage = new MembersPage(page);
    console.log('TC_ROLE_002: Điều hướng tới trang quản lý thành viên /dash/manage-account/members');
    await membersPage.goto(systemUrl);

    console.log('TC_ROLE_002: Bấm chuyển sang tab "Vai trò & Quyền hạn"');
    await membersPage.clickRolesTab();

    console.log('TC_ROLE_002: Chọn vai trò "User"');
    await membersPage.selectUserRole();

    console.log('TC_ROLE_002: Xác minh nút "Xóa vai trò" không hiển thị (bị ẩn)');
    const isDeleteVisible = await membersPage.isDeleteButtonVisible();
    expect(isDeleteVisible).toBe(false);

    console.log('TC_ROLE_002: Vai trò "user" đã được bảo vệ thành công trên UI (PASS)');
  });
});

import { deleteRole } from '../../../dashboard/lib/services/member.service';

test.describe('Role Management Backend - Deletion Protection @backend @role', () => {
  test('TC_ROLE_003 - Chặn xóa vai trò mặc định "admin" qua Backend Service @role @backend', async () => {
    console.log('TC_ROLE_003: Gọi trực tiếp hàm deleteRole với id "admin" từ service');
    let threwError = false;
    try {
      await deleteRole('admin');
    } catch (err: any) {
      threwError = true;
      expect(err.message).toContain('Không thể xóa vai trò hệ thống mặc định.');
    }
    expect(threwError).toBe(true);
    console.log('TC_ROLE_003: Chặn xóa vai trò "admin" ở Backend service thành công (PASS)');
  });

  test('TC_ROLE_004 - Chặn xóa vai trò mặc định "user" qua Backend Service @role @backend', async () => {
    console.log('TC_ROLE_004: Gọi trực tiếp hàm deleteRole với id "user" từ service');
    let threwError = false;
    try {
      await deleteRole('user');
    } catch (err: any) {
      threwError = true;
      expect(err.message).toContain('Không thể xóa vai trò hệ thống mặc định.');
    }
    expect(threwError).toBe(true);
    console.log('TC_ROLE_004: Chặn xóa vai trò "user" ở Backend service thành công (PASS)');
  });
});
