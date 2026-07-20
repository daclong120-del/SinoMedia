import { test, expect } from '@playwright/test';

test.describe('Crawler Live Smoke Tests @crawler @live-smoke @quarantine', () => {

  test.beforeEach(() => {
    test.skip(
      process.env.RUN_LIVE_CRAWLER_SMOKE !== '1',
      'RUN_LIVE_CRAWLER_SMOKE must be 1 to run live crawler smoke tests.'
    );
  });

  test('TC_CREATIVE_006 - Lọc xếp hạng Creative theo mốc thời gian 7 ngày qua (Live)', async ({ request }) => {
    const res = await request.get('https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en');
    expect(res.status()).toBe(200);
  });

  test('TC_PLATFORM_002 - Crawl Bilibili BVID (Live)', async ({ request }) => {
    const res = await request.get('https://space.bilibili.com/123456/video');
    expect(res.status()).toBe(200);
  });
});
