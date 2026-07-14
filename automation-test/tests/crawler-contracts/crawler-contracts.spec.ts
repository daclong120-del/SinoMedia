import { test, expect } from '@playwright/test';
import { normalizeCookie } from '@/lib/services/crawler.service';
import { getZhihuSign } from '@@/src/sign/zhihu_sign';

function parseBilibiliCookie(cookieStr: string) {
  const normalized = normalizeCookie(cookieStr);
  const sessdataMatch = normalized.match(/SESSDATA=([^;]+)/);
  const jctMatch = normalized.match(/bili_jct=([^;]+)/);
  return {
    SESSDATA: sessdataMatch ? sessdataMatch[1].trim() : null,
    bili_jct: jctMatch ? jctMatch[1].trim() : null
  };
}

function buildBilibiliIframeUrl(bvid: string) {
  return `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&as_wide=1&autoplay=0`;
}

test.describe('Crawler Contracts @crawler @contract @cookie', () => {

  test('TC_COOKIE_004 - Zhihu strips quoted d_c0', async () => {
    const url = '/api/v4/search_v3?t=general&q=test';
    const cookieWithQuotes = 'd_c0="1234567890_abc"; zse_ck=1';
    const cookieWithoutQuotes = 'd_c0=1234567890_abc; zse_ck=1';

    // Mock Math.random để trả về giá trị cố định vì chữ ký sử dụng random unshift
    const originalRandom = Math.random;
    Math.random = () => 0.5;

    try {
      const sign1 = getZhihuSign(url, cookieWithQuotes);
      const sign2 = getZhihuSign(url, cookieWithoutQuotes);

      // Chữ ký của cả 2 chuỗi cookie (có nháy và không nháy kép) phải trùng khớp
      expect(sign1['x-zse-96']).toBe(sign2['x-zse-96']);
      expect(sign1['x-zst-81']).toBe(sign2['x-zst-81']);
    } finally {
      // Khôi phục Math.random
      Math.random = originalRandom;
    }
  });

  test('TC_COOKIE_006 - Bilibili cookie parsing', async () => {
    const rawCookie = 'SESSDATA=bili_sess_123; bili_jct=bili_csrf_abc; other_key=val';
    const parsed = parseBilibiliCookie(rawCookie);

    expect(parsed.SESSDATA).toBe('bili_sess_123');
    expect(parsed.bili_jct).toBe('bili_csrf_abc');

    const jsonCookie = '{"cookie": "SESSDATA=bili_sess_456; bili_jct=bili_csrf_def;"}';
    const parsedJson = parseBilibiliCookie(jsonCookie);
    expect(parsedJson.SESSDATA).toBe('bili_sess_456');
    expect(parsedJson.bili_jct).toBe('bili_csrf_def');
  });

  test('TC_COOKIE_007 - JSON array cookie normalization', async () => {
    const jsonArray = '[{"name": "sessionid", "value": "123"}, {"name": "uid", "value": "456"}]';
    const normalized = normalizeCookie(jsonArray);

    expect(normalized).toBe('sessionid=123; uid=456');

    const jsonObject = '{"sessionid": "123", "uid": "456"}';
    const normalizedObj = normalizeCookie(jsonObject);
    expect(normalizedObj).toBe('sessionid=123; uid=456');
  });

  test('TC_FAULT_001 - Bilibili player build iframe URL', async () => {
    const bvid = 'BV1xx411c7Fz';
    const iframeUrl = buildBilibiliIframeUrl(bvid);

    expect(iframeUrl).toContain('player.bilibili.com/player.html');
    expect(iframeUrl).toContain(`bvid=${bvid}`);
    expect(iframeUrl).toContain('high_quality=1');
  });
});
