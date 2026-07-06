# Design — Phase 01: XhsClient & Signature Generation

## Mục tiêu (người dùng được gì)
- Triển khai thành công `XhsClient` trong TypeScript với cơ chế tự động ký request (sinh chữ ký `X-S`, `X-T`, `x-s-common`, `X-B3-Traceid`).
- Cho phép gửi các yêu cầu HTTP GET/POST tới API Xiaohongshu ổn định mà không bị chặn lỗi 461/471 (Captcha/Anti-bot).

## Hành vi / use case
- `XhsClient` thực hiện gửi yêu cầu HTTP bằng cách ký yêu cầu trước:
  - Nếu `playwrightPage` khả dụng: Gọi `page.evaluate` để thực thi `window._webmsxyw(url, data)` trực tiếp trong context trình duyệt để sinh `X-S` và `X-T`.
  - Tự tính toán `x-s-common` sử dụng thuật toán MRC (CRC32 variant) và Custom Base64.
  - Sinh mã `x-b3-traceid` ngẫu nhiên.
  - Gộp tất cả các header chữ ký vào request và gửi đi.
- Hỗ trợ kiểm tra sức khỏe client qua hàm `pong()`.

## Hướng kỹ thuật đã chọn (+ vì sao)
- **Playwright `page.evaluate()` Bridge**: `window._webmsxyw` là hàm sinh chữ ký cốt lõi của XHS chạy trong JS của trình duyệt. Việc gọi nó qua Playwright giúp thừa hưởng toàn bộ cập nhật obfuscation của XHS.
- **Node.js Local Helpers**: Các tham số phụ như `x-s-common` được tính toán trực tiếp trong Node.js để giảm bớt gánh nặng giao tiếp với browser context và tăng tốc độ xử lý.

## Các bước thực thi
1. **Signature Helpers (`sign.ts`)**: Tạo file chứa thuật toán CRC32 variant (`mrc`), custom Base64 encoder (`b64Encode`), sinh ID (`getB3TraceId`, `getSearchId`).
2. **Client Request Hook (`client.ts`)**:
   - Tích hợp gọi `page.evaluate()` để lấy `X-S`, `X-T`.
   - Kết hợp các helpers để tạo `x-s-common` và `x-b3-traceid`.
   - Implement hàm `request()` gửi HTTP request qua Node `fetch` (hoặc undici với proxy support).
   - Implement hàm `pong()` kiểm tra trạng thái login qua API profile.

## Edge case / rủi ro
- **Browser context chưa load xong trang XHS**: Nếu browser chưa điều hướng tới XHS, `window._webmsxyw` sẽ chưa được khai báo. Khắc phục: Trước khi evaluate chữ ký, kiểm tra nếu `window._webmsxyw` undefined thì điều hướng nhẹ tới trang chủ `https://www.xiaohongshu.com` và chờ load.
