# Task Checklist — Phase 1: XhsClient & Signature Generation

- `[x]` Bước 1: Tạo utility helpers `sign.ts`
  - `[x]` Port bảng tra cứu CRC32 (`CRC32_TABLE`)
  - `[x]` Port thuật toán MRC (`mrc`)
  - `[x]` Port bộ mã hóa Base64 tùy biến (`b64Encode` & các hàm liên quan)
  - `[x]` Port hàm sinh `getB3TraceId` và `getSearchId`
- `[x]` Bước 2: Cập nhật `XhsClient` (`client.ts`)
  - `[x]` Thêm hỗ trợ Playwright Page setter (`setPage`)
  - `[x]` Định nghĩa hàm sinh headers ký `_preHeaders` tương thích GET/POST
  - `[x]` Hoàn thiện hàm `request` để tự động ký và gửi HTTP request
  - `[x]` Hoàn thiện hàm `pong` để kiểm tra trạng thái login qua API `/api/sns/web/v1/user/profile` hoặc tương đương
- `[x]` Bước 3: Xác minh cơ bản
  - `[x]` Viết một script chạy thử nhỏ trong scratchpad gọi pong hoặc một API đơn giản
  - `[x]` Chạy script kiểm thử scratchpad để xác minh đầu ra (đã khớp 100% với Python)
