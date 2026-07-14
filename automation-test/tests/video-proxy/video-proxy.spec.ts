import { test, expect } from '@playwright/test';
import { ConfigReader } from '../../src/utils/ConfigReader';

test.describe('Video Proxy Security API @crawler @security', () => {
  let baseUrl = 'http://localhost:3000';

  test.beforeAll(async () => {
    baseUrl = ConfigReader.baseUrl;
  });

  test('Kiểm tra chặn truy cập trái phép khi chưa đăng nhập (401)', async ({ playwright }) => {
    const anonymousContext = await playwright.request.newContext({
      storageState: { cookies: [], origins: [] }
    });
    const res = await anonymousContext.get(`${baseUrl}/api/video/proxy?url=https://www.douyin.com/video/123`);
    expect(res.status()).toBe(401);
  });

  test('Kiểm tra chỉ chấp nhận giao thức HTTPS', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/video/proxy?url=http://www.douyin.com/video/123`);
    expect(res.status()).toBe(400);
    const text = await res.text();
    expect(text).toContain('Only HTTPS protocol is supported');
  });

  test('Kiểm tra chặn các domain không nằm trong allowlist (403)', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/video/proxy?url=https://youtube.com/watch?v=123`);
    expect(res.status()).toBe(403);
    const text = await res.text();
    expect(text).toContain('Forbidden domain target');
  });

  test('TC_FAULT_004 - Chặn truy cập IP nội bộ/SSRF (403)', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/video/proxy?url=https://127.0.0.1/video`);
    expect(res.status()).toBe(403);
  });

  test('Kiểm tra định dạng Range header không hợp lệ', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/video/proxy?url=https://www.douyin.com/video/123`, {
      headers: {
        'Range': 'invalid-range-format'
      }
    });
    expect(res.status()).toBe(400);
    const text = await res.text();
    expect(text).toContain('Invalid Range header format');
  });
});
