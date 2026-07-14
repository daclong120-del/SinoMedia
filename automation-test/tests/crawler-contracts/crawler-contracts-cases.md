# Đặc tả Chi tiết 27 Test Cases Crawler SinoMedia

Tài liệu này là Source of Truth đặc tả chi tiết 27 kịch bản kiểm thử (test cases) cho hệ thống crawler đa kênh của SinoMedia.

---

## 1. Nhóm Creative & Post Ranking (6 cases)

### TC_CREATIVE_006 - Lọc xếp hạng Creative theo mốc thời gian 7 ngày qua
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Mốc thời gian `Last 7 Days`
- **Expected**: Danh sách creative trả về chỉ chứa các creative có ngày đăng ký trong vòng 7 ngày qua.

### TC_CREATIVE_007 - Lọc xếp hạng Creative theo định dạng Video dọc
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Định dạng `Vertical Video (9:16)`
- **Expected**: Các creative video trả về đều có tỉ lệ khung hình `9:16`.

### TC_CREATIVE_008 - Lọc xếp hạng Creative theo mục tiêu chiến dịch quảng cáo
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Mục tiêu `App Installs`
- **Expected**: Chỉ hiển thị các creative có mục tiêu chiến dịch quảng cáo là cài đặt ứng dụng.

### TC_CREATIVE_009 - Sắp xếp bảng xếp hạng Creative theo chỉ số CTR giảm dần
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Sắp xếp `CTR giảm dần`
- **Expected**: Creative có CTR cao nhất (ví dụ: 4.5%) được xếp ở vị trí đầu tiên.

### TC_CREATIVE_010 - Sắp xếp bảng xếp hạng Creative theo chỉ số CVR giảm dần
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Sắp xếp `CVR giảm dần`
- **Expected**: Creative có CVR cao nhất (ví dụ: 12.3%) được xếp ở vị trí đầu tiên.

### TC_CREATIVE_011 - Sắp xếp bảng xếp hạng Creative theo chi tiêu quảng cáo
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Sắp xếp `Ad Spend giảm dần`
- **Expected**: Các creative có ngân sách chạy lớn nhất được xếp lên trên cùng.

---

## 2. Nhóm Cookie & Hydration (5 cases)

### TC_COOKIE_004 - Zhihu strips quoted d_c0
- **Type**: contract
- **Test Data**: Cookie string chứa `d_c0="1234567890_abc"; zse_ck=...`
- **Expected**: Dấu nháy kép bọc ngoài `d_c0` tự động bị loại bỏ thành `1234567890_abc` trước khi ký chữ ký. Không in raw cookie ra logs.

### TC_COOKIE_005 - Douyin session bootstrap & hydration
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Raw cookie string `sessionid=douyin_raw_cookie_123`
- **Expected**: Chromium persistent context tự động khởi tạo dưới nền, nạp cookie, truy cập trang để sinh enriched `DouyinSession` chứa `msToken` và `webid`.

### TC_COOKIE_006 - Bilibili cookie parsing
- **Type**: contract
- **Test Data**: Cookie string `SESSDATA=bili_sess_123; bili_jct=bili_csrf_abc;`
- **Expected**: Bóc tách chính xác các tham số `SESSDATA` và `bili_jct`.

### TC_COOKIE_007 - JSON array cookie normalization
- **Type**: contract
- **Test Data**: JSON Array `[{"name": "sessionid", "value": "123"}, {"name": "uid", "value": "456"}]`
- **Expected**: Chuẩn hóa thành công về dạng cookie string sạch `sessionid=123; uid=456`.

### TC_COOKIE_008 - Duplicate Cookie Ownership
- **Status**: blocked-by-feature
- **Note**: Tránh ghi đè trùng lặp cookie fingerprint khi nạp tài khoản (cần phát triển tính năng fingerprint trước).

---

## 3. Nhóm Browser Cookie Extraction (4 cases)

### TC_BROWSER_004 - Chrome Profile Zhihu Cookie Extraction
- **Status**: blocked-by-feature
- **Note**: Phụ thuộc đường dẫn thư mục profile thực tế trên máy người dùng và cơ chế giải mã DPAPI.

### TC_BROWSER_005 - Edge Profile Douyin Cookie Extraction
- **Status**: blocked-by-feature

### TC_BROWSER_006 - Brave Profile Bilibili Cookie Extraction
- **Status**: blocked-by-feature

### TC_BROWSER_007 - Opera Profile Weibo Cookie Extraction
- **Status**: blocked-by-feature

---

## 4. Nhóm Platform Chromium ID Crawl (7 cases)

### TC_PLATFORM_001 - Crawl Douyin User ID
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Link kênh `https://www.douyin.com/user/MS4wLjABAAAA_xyz`
- **Expected**: Chromium lấy được ID kênh `dy_sinomedia` và nickname tương ứng.

### TC_PLATFORM_002 - Crawl Bilibili BVID
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Link kênh `https://space.bilibili.com/123456/video`
- **Expected**: Trích xuất thành công danh sách BVID (ví dụ: `BV1xx411c7Fz`) từ danh sách video.

### TC_PLATFORM_003 - Crawl Xiaohongshu Note ID
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Link explorer `https://www.xiaohongshu.com/explore`
- **Expected**: Trích xuất thành công mảng chứa danh sách Note ID hiển thị trên trang.

### TC_PLATFORM_004 - Crawl Weibo Mid
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Link feed `https://weibo.com/u/1234567890`
- **Expected**: Trích xuất thành công ID bài viết Weibo Mid từ dòng thời gian.

### TC_PLATFORM_005 - Crawl Zhihu Answer ID
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Link câu hỏi `https://www.zhihu.com/question/123456`
- **Expected**: Trích xuất thành công danh sách ID câu trả lời hàng đầu.

### TC_PLATFORM_006 - Crawl Kuaishou Author ID
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Link video `https://www.kuaishou.com/f/3xxxyyyzzz`
- **Expected**: Trích xuất thành công ID tác giả gốc của video.

### TC_PLATFORM_007 - Crawl Baidu Tieba Thread ID
- **Type**: live-smoke / quarantine
- **Env Required**: `RUN_LIVE_CRAWLER_SMOKE=1`
- **Test Data**: Link diễn đàn `https://tieba.baidu.com/f?kw=sinomedia`
- **Expected**: Trích xuất thành công danh sách Thread ID nổi bật hiển thị trên trang.

---

## 5. Nhóm Fault/Security (5 cases)

### TC_FAULT_001 - Bilibili player build iframe URL
- **Type**: contract
- **Test Data**: BVID `BV1xx411c7Fz`
- **Expected**: Creative detail render đúng mã iframe player của Bilibili. Không gọi `/api/video/proxy` và không phát sinh task tải file về R2.

### TC_FAULT_002 - Douyin Captcha Diagnostics
- **Status**: blocked-by-feature
- **Note**: Chạy mô phỏng diagnostic hard gate khi Douyin gặp Captcha chặn.

### TC_FAULT_003 - Zhihu signature auto-fix signature error
- **Type**: contract
- **Test Data**: Trực tiếp chạy unit test signer zhihu_sign.
- **Expected**: Kiểm chứng việc strip `d_c0` giúp tạo chữ ký hợp lệ thành công.

### TC_FAULT_004 - Video Proxy SSRF block private/local IP
- **Type**: security
- **Test Data**: URL redirect về `192.168.1.1` hoặc `127.0.0.1`
- **Expected**: API chặn và trả về HTTP `403 Forbidden` chống tấn công SSRF mạng nội bộ.

### TC_FAULT_005 - Douyin Guest Mode Fallback
- **Status**: blocked-by-feature
- **Note**: docs hiện tại quy định fail-fast khi không có session, chưa hỗ trợ Guest Mode mặc định.
