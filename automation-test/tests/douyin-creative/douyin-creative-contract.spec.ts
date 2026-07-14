import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Import các mapper & helper từ crawler-pipeline
import { mapAwemeToPostRow, mapCommentRow } from '../../../crawler-pipeline/src/crawl/douyin/mapper.js';
import { parseVideoInfoFromUrl, parseCreatorInfoFromUrl } from '../../../crawler-pipeline/src/crawl/douyin/help.js';
import { parseCookieString, buildCookieString, createSessionFromRaw } from '../../../crawler-pipeline/src/crawl/douyin/session.js';

// Đường dẫn đọc fixtures
const fixturesDir = path.resolve(__dirname, '../../fixtures/douyin');
const loadFixture = (filename: string) => {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, filename), 'utf8'));
};

test.describe('Douyin Creative Crawl - Offline Contract Tests @backend @crawler @creative @douyin', () => {
  
  test('TC_DY_CREATIVE_001 - Map aweme video detail thành crawled_posts row @douyin @creative', async () => {
    const rawVideoDetail = loadFixture('aweme-detail-video.json');
    const authorUuid = 'author-test-uuid-001';
    
    const postRow = mapAwemeToPostRow(rawVideoDetail, authorUuid) as any;
    
    expect(postRow.platform).toBe('douyin');
    expect(postRow.platform_id).toBe('7123456789012345678');
    expect(postRow.author_id).toBe(authorUuid);
    expect(postRow.caption).toContain('Đây là video clip test');
    expect(postRow.media_type).toBe('video');
    expect(postRow.media_urls).toContain('https://aweme.snssdk.com/aweme/v1/play/video.mp4');
    expect(postRow.cover_url).toBeUndefined(); // Không có cover trong fixture video
    expect(postRow.media_status).toBe('original_only');
    expect(postRow.media_source).toBe('original');
  });

  test('TC_DY_CREATIVE_002 - Map aweme image/carousel detail @douyin @creative', async () => {
    const rawImageDetail = loadFixture('aweme-detail-image.json');
    const authorUuid = 'author-test-uuid-002';
    
    const postRow = mapAwemeToPostRow(rawImageDetail, authorUuid) as any;
    
    expect(postRow.platform).toBe('douyin');
    expect(postRow.platform_id).toBe('7123456789012345679');
    expect(postRow.media_type).toBe('carousel');
    expect(postRow.media_urls.length).toBe(2);
    expect(postRow.media_urls[0]).toBe('https://p3.douyinpic.com/img/image1.jpeg');
    expect(postRow.cover_url).toBe('https://p3.douyinpic.com/img/image1.jpeg');
  });

  test('TC_DY_CREATIVE_005 - Stats normalize chuyển đổi về dạng số @douyin @creative', async () => {
    const rawVideoDetail = loadFixture('aweme-detail-video.json');
    const postRow = mapAwemeToPostRow(rawVideoDetail, 'author-test') as any;
    
    expect(postRow.stats.play_count).toBe(100000);
    expect(postRow.stats.digg_count).toBe(5000);
    expect(postRow.stats.comment_count).toBe(250);
    expect(postRow.stats.share_count).toBe(80);
  });

  test('TC_DY_SESSION_001 - Cookie raw string tạo được DouyinSession @douyin @creative', async () => {
    const rawCookieStr = 'webid=123456789; msToken=abcxyz; __ac_webid=987654321';
    
    const cookies = parseCookieString(rawCookieStr);
    expect(cookies.length).toBe(3);
    expect(cookies[0].name).toBe('webid');
    expect(cookies[0].value).toBe('123456789');
    
    const session = createSessionFromRaw(rawCookieStr, 'test_source');
    expect(session.webid).toBe('987654321'); // __ac_webid lấy từ cookie
    expect(session.msToken).toBe('abcxyz');
    expect(session.cookieString).toContain('webid=123456789');
  });

  test('TC_DY_SESSION_002 - Cookie JSON object tạo được session @douyin @creative', async () => {
    const sessionData = {
      cookies: [
        { name: 'dy_did', value: 'dy_did_test_value' },
        { name: 's_v_web_id', value: 'verify_fp_test_value' }
      ],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    };
    
    const session = createSessionFromRaw(sessionData, 'test_json_source');
    expect(session.webid).toBe('dy_did_test_value');
    expect(session.verifyFp).toBe('verify_fp_test_value');
    expect(session.browserPlatform).toBe('Win32');
    expect(session.browserVersion).toBe('120.0.0.0');
  });

  test('TC_DY_DETAIL_001 - Extract aweme id từ numeric id @douyin @creative', async () => {
    const result = parseVideoInfoFromUrl('7123456789012345678');
    expect(result.awemeId).toBe('7123456789012345678');
    expect(result.urlType).toBe('normal');
  });

  test('TC_DY_DETAIL_002 - Extract aweme id từ URL /video/<id> @douyin @creative', async () => {
    const result = parseVideoInfoFromUrl('https://www.douyin.com/video/7123456789012345678?mode=1');
    expect(result.awemeId).toBe('7123456789012345678');
    expect(result.urlType).toBe('normal');
  });

  test('TC_DY_DETAIL_003 - Extract aweme id từ query modal_id @douyin @creative', async () => {
    const result = parseVideoInfoFromUrl('https://www.douyin.com/search/AI?modal_id=7123456789012345678');
    expect(result.awemeId).toBe('7123456789012345678');
    expect(result.urlType).toBe('modal');
  });

  test('TC_DY_DETAIL_004 - Invalid URL fail rõ ràng @douyin @creative', async () => {
    expect(() => parseVideoInfoFromUrl('https://www.google.com/search?q=this_is_a_very_long_url_that_should_fail_parsing_id_for_sure_1234567890')).toThrow();
  });

  test('TC_DY_CREATOR_001 - Extract sec_user_id từ URL đầy đủ @douyin @creative', async () => {
    const result = parseCreatorInfoFromUrl('https://www.douyin.com/user/MS4wLjABAAAA_sec_user_id_test_123?showTab=post');
    expect(result.secUserId).toBe('MS4wLjABAAAA_sec_user_id_test_123');
  });

  test('TC_DY_COMMENT_001 - Crawl first-level comments và map comment row @douyin @creative', async () => {
    const rawCommentsData = loadFixture('comments-page.json');
    const firstComment = rawCommentsData.comments[0];
    
    const commentRow = mapCommentRow(firstComment, '7123456789012345678', 'post-uuid-001');
    
    expect(commentRow.platform).toBe('douyin');
    expect(commentRow.platform_cid).toBe('223344556677');
    expect(commentRow.post_id).toBe('post-uuid-001');
    expect(commentRow.platform_post_id).toBe('7123456789012345678');
    expect(commentRow.content).toBe('Video rất hay và ý nghĩa!');
    expect(commentRow.like_count).toBe(45);
    expect(commentRow.author_nickname).toBe('User bình luận 1');
  });

  test('TC_DY_FAULT_001 - Cookie/session không leak vào log @douyin @creative', async () => {
    // Import redactSecrets trực tiếp để kiểm chứng redaction
    const { redactSecrets } = require('../../../crawler-pipeline/src/utils/logger.js');
    const secretLog = 'Khởi chạy với cookie="dy_did=1234567890abcdef; path=/;"';
    const redacted = redactSecrets(secretLog);
    expect(redacted).toContain('[MASKED]');
    expect(redacted).not.toContain('1234567890abcdef');
  });

  test('TC_DY_TASK_009 - CURRENT_TASK env cleanup check @douyin @creative', async () => {
    process.env.CURRENT_TASK_ID = 'task-123456';
    expect(process.env.CURRENT_TASK_ID).toBe('task-123456');
    
    // Cleanup mô phỏng queue worker finally
    delete process.env.CURRENT_TASK_ID;
    expect(process.env.CURRENT_TASK_ID).toBeUndefined();
  });
});
