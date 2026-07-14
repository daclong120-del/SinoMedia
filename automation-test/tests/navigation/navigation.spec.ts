import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ConfigReader } from '../../src/utils/ConfigReader';

// Sử dụng session login admin mặc định
test.describe('Navigation and Sidebar Authorization @ui @navigation', () => {
  const systemUrl = ConfigReader.baseUrl;

  test('TC_NAV_001 - Điều hướng qua các menu chính trên Sidebar bằng tài khoản Admin @navigation @ui', async ({ page }) => {
    // Session admin đã được nạp sẵn qua storageState
    await page.goto(`${systemUrl}/dash/home`);
    await page.waitForLoadState('networkidle');

    // 1. Kiểm tra menu Tổng quan
    const homeLink = page.getByRole('link', { name: /Tổng quan/i }).first();
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL(new RegExp('.*/dash/home.*'));

    // 2. Kiểm tra menu Chiến dịch & Nhiệm vụ (dùng regex /Nhiệm vụ/i để tránh từ nhạy cảm)
    const tasksLink = page.getByRole('link', { name: /Nhiệm vụ/i }).first();
    await expect(tasksLink).toBeVisible();
    await tasksLink.click();
    await expect(page).toHaveURL(new RegExp('.*/dash/tasks.*'));

    // 3. Kiểm tra menu Cài đặt hệ thống
    const settingsLink = page.getByRole('link', { name: /Cài đặt/i }).first();
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();
    await expect(page).toHaveURL(new RegExp('.*/dash/settings.*'));

    // 4. Kiểm tra menu Quản lý thành viên
    const membersLink = page.getByRole('link', { name: /Thành viên/i }).first();
    await expect(membersLink).toBeVisible();
    await membersLink.click();
    await expect(page).toHaveURL(new RegExp('.*/dash/manage-account/members.*'));
  });
});

// Xóa storageState để đăng nhập thủ công bằng tài khoản thường
test.describe('Navigation Unauthorized Redirect @ui @navigation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  const systemUrl = ConfigReader.baseUrl;

  test('TC_NAV_002 - Chặn truy cập trang Quản lý thành viên đối với tài khoản không có quyền Admin @navigation @ui', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Đăng nhập bằng tài khoản thường
    const userEmail = 'user_test@sinomedia.vn';
    const userPassword = 'testpassword123';
    
    console.log(`TC_NAV_002: Đăng nhập bằng tài khoản thường: ${userEmail}`);
    await loginPage.goto(systemUrl);
    await loginPage.login(userEmail, userPassword);

    // Xác nhận đã đăng nhập thành công vào trang home
    await expect(page).toHaveURL(new RegExp('.*/dash/home.*'));

    // Cố tình truy cập trực tiếp vào trang quản lý thành viên dành riêng cho Admin
    console.log('TC_NAV_002: Cố gắng truy cập trực tiếp route /dash/manage-account/members');
    await page.goto(`${systemUrl}/dash/manage-account/members`);
    await page.waitForLoadState('networkidle');

    // Kỳ vọng: Bị chuyển hướng ngược lại dash/home kèm theo tham số báo lỗi unauthorized
    await expect(page).toHaveURL(new RegExp('.*/dash/home\\?error=unauthorized.*'));
    console.log('TC_NAV_002: Đã chặn và chuyển hướng thành công đối với user thường (PASS)');
  });
});
