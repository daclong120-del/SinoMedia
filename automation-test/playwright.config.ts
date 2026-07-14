import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Đọc cấu hình từ file .env và dashboard/.env.local
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../dashboard/.env.local') });

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const parsedBaseURL = new URL(baseURL);
const shouldStartDashboard =
  process.env.PW_SKIP_DASHBOARD_SERVER !== '1' &&
  parsedBaseURL.protocol === 'http:' &&
  ['127.0.0.1', 'localhost'].includes(parsedBaseURL.hostname);
const dashboardPort = parsedBaseURL.port || '3000';

const realtimeReporter = process.env.PW_REALTIME_REPORTER === '1'
  ? [[path.resolve(__dirname, 'runner/realtime-reporter.cjs')]] as any[]
  : [];

export default defineConfig({
  testDir: './tests',
  /* Chạy các test song song */
  fullyParallel: true,
  /* Bắt lỗi test ngắt quãng trên CI */
  forbidOnly: !!process.env.CI,
  /* Thử lại nếu test bị flaky */
  retries: process.env.CI ? 2 : 0,
  /* Số lượng luồng thực thi song song mặc định */
  workers: process.env.PARALLEL_WORKERS ? parseInt(process.env.PARALLEL_WORKERS) : 4,
  /* Báo cáo xuất ra dưới dạng html và json */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ...realtimeReporter
  ],
  webServer: shouldStartDashboard
    ? {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${dashboardPort}`,
        cwd: path.resolve(__dirname, '../dashboard'),
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      }
    : undefined,
  /* Cấu hình dùng chung cho tất cả các dự án */
  use: {
    /* Base URL lấy từ biến môi trường */
    baseURL,
    /* Thu thập trace khi test lỗi */
    trace: 'retain-on-failure',
    /* Chụp màn hình khi test lỗi */
    screenshot: 'only-on-failure',
    /* Kích thước màn hình tiêu chuẩn */
    viewport: { width: 1920, height: 1080 },
    /* Chạy chế độ headless hay có giao diện */
    headless: process.env.HEADLESS === 'false' ? false : true,
  },

  /* Cấu hình các trình duyệt test */
  projects: [
    // 1. Project chạy setup đăng nhập trước
    {
      name: 'setup',
      testMatch: /.*\/_setup\/.*\.setup\.ts/,
    },
    // 2. Project chromium chạy test chính
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Nạp trạng thái đăng nhập chung
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
