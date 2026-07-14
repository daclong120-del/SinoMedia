import { test, expect } from '@playwright/test';
import * as path from 'path';
import { deleteRole } from '../../dashboard/lib/services/member.service';

test.describe('Role Management E2E - Deletion Protection', () => {
  const systemUrl = process.env.BASE_URL || 'http://localhost:3000';
  const email = 'admin_test@sinomedia.vn';
  const password = 'testpassword123';

  test.beforeEach(async ({ page }) => {
    // Đăng nhập và đi tới trang quản lý vai trò
    console.log(`Đăng nhập với tài khoản: ${email}`);
    await page.goto(`${systemUrl}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="name@example.com"]', email);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dash/**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('TC_ROLE_001 - Chặn xóa vai trò mặc định "admin" trên UI', async ({ page }) => {
    // Đi tới trang quản lý thành viên
    await page.goto(`${systemUrl}/dash/manage-account/members`);
    await page.waitForLoadState('networkidle');

    // Click vào tab "Vai trò & Quyền hạn"
    await page.click('button:has-text("Vai trò"), button:has-text("Roles"), button:has-text("Quyền hạn")');
    await page.waitForTimeout(500);

    // Click chọn vai trò "Admin" trong danh sách bên trái
    await page.click('div:has-text("Admin") >> nth=0');
    await page.waitForTimeout(200);

    // Kiểm tra xem nút "Xóa vai trò" có bị ẩn hoàn toàn không
    const deleteBtn = page.locator('button:has-text("Xóa vai trò")');
    await expect(deleteBtn).not.toBeVisible();
    console.log('TC_ROLE_001: Nút "Xóa vai trò" cho Admin bị ẩn hoàn toàn (PASS)');
  });

  test('TC_ROLE_002 - Chặn xóa vai trò mặc định "user" trên UI', async ({ page }) => {
    // Đi tới trang quản lý thành viên
    await page.goto(`${systemUrl}/dash/manage-account/members`);
    await page.waitForLoadState('networkidle');

    // Click vào tab "Vai trò & Quyền hạn"
    await page.click('button:has-text("Vai trò"), button:has-text("Roles"), button:has-text("Quyền hạn")');
    await page.waitForTimeout(500);

    // Click chọn vai trò "User" trong danh sách bên trái
    await page.click('div:has-text("User") >> nth=0');
    await page.waitForTimeout(200);

    // Kiểm tra xem nút "Xóa vai trò" có bị ẩn hoàn toàn không
    const deleteBtn = page.locator('button:has-text("Xóa vai trò")');
    await expect(deleteBtn).not.toBeVisible();
    console.log('TC_ROLE_002: Nút "Xóa vai trò" cho User bị ẩn hoàn toàn (PASS)');
  });

  test('TC_ROLE_003 - Chặn xóa vai trò mặc định "admin" qua Backend Service', async () => {
    // Gọi trực tiếp hàm deleteRole với id 'admin' và kiểm tra xem có ném lỗi chính xác không
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
    // Gọi trực tiếp hàm deleteRole với id 'user' và kiểm tra xem có ném lỗi chính xác không
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
