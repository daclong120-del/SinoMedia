import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TasksPage } from '../../src/pages/TasksPage';
import { ConfigReader } from '../../src/utils/ConfigReader';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Tasks Management Dashboard @ui @tasks', () => {
  const systemUrl = ConfigReader.baseUrl;

  test.beforeEach(async ({ page }) => {
    // Đã đăng nhập sẵn qua storageState
  });

  test('TC_TASK_001 - Hiển thị tiêu đề và danh sách nhiệm vụ crawl @tasks @ui', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    console.log('TC_TASK_001: Điều hướng tới trang nhiệm vụ /dash/tasks');
    await tasksPage.goto(systemUrl);

    // Xác nhận tiêu đề trang hiển thị
    const isTitleVisible = await tasksPage.isTitleVisible();
    expect(isTitleVisible).toBe(true);

    // Xác nhận bảng danh sách nhiệm vụ hiển thị
    const isTableVisible = await tasksPage.isTableVisible();
    expect(isTableVisible).toBe(true);

    console.log('TC_TASK_001: Tiêu đề và bảng nhiệm vụ hiển thị đầy đủ (PASS)');
  });
});
