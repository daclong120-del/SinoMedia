import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { MembersPage } from '../src/pages/MembersPage';
import { ConfigReader } from '../src/utils/ConfigReader';
import { deleteRole } from '../../dashboard/lib/services/member.service';

test.describe('Role Management UI - Deletion Protection @ui @role', () => {
  const systemUrl = ConfigReader.baseUrl;
  const email = ConfigReader.testUserEmail;
  const password = ConfigReader.testUserPassword;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    console.log(`Đăng nhập với tài khoản: ${email}`);
    await loginPage.goto(systemUrl);
    await loginPage.login(email, password);
  });

  test('TC_ROLE_001 - Chặn xóa vai trò mặc định "admin" trên UI', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto(systemUrl);
    await membersPage.clickRolesTab();
    await membersPage.selectAdminRole();

    const isDeleteVisible = await membersPage.isDeleteButtonVisible();
    expect(isDeleteVisible).toBe(false);
    console.log('TC_ROLE_001: Nút "Xóa vai trò" cho Admin bị ẩn hoàn toàn (PASS)');
  });

  test('TC_ROLE_002 - Chặn xóa vai trò mặc định "user" trên UI', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto(systemUrl);
    await membersPage.clickRolesTab();
    await membersPage.selectUserRole();

    const isDeleteVisible = await membersPage.isDeleteButtonVisible();
    expect(isDeleteVisible).toBe(false);
    console.log('TC_ROLE_002: Nút "Xóa vai trò" cho User bị ẩn hoàn toàn (PASS)');
  });
});

test.describe('Role Management Backend - Deletion Protection @backend @role', () => {
  test('TC_ROLE_003 - Chặn xóa vai trò mặc định "admin" qua Backend Service', async () => {
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

  test('TC_ROLE_004 - Chặn xóa vai trò mặc định "user" qua Backend Service', async () => {
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
