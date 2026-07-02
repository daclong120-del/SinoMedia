# 📋 Checklist Triển khai Phase 1 — Bilibili Crawler Hybrid
 
Tệp này liệt kê chi tiết các công việc cần thực hiện để hoàn tất Phase 1 theo mô hình hybrid chuẩn.
 
- `[x]` **Bước 1: Tái cấu trúc `src/crawl/bilibili/client.ts` (HTTP-First chuẩn)**
  - `[x]` Gỡ bỏ toàn bộ logic điều hướng trình duyệt `page.goto` và `page.evaluate` fetch trong `bilibiliRequest`.
  - `[x]` Đảm bảo `bilibiliRequest` sử dụng HTTP client (`impit`/fetch) và ném lỗi `DataFetchError` nếu lỗi.
  - `[x]` Triển khai hàm `getWbiKeys()` gọi API `/x/web-interface/nav` qua HTTP, fallback qua localStorage trình duyệt chỉ khi HTTP bị chặn.
 
- `[x]` **Bước 2: Triển khai hoàn thiện luồng đăng nhập trong `src/crawl/bilibili/login.ts`**
  - `[x]` Bổ sung hỗ trợ đăng nhập QR Code (`loginByQrcode`) hiển thị QR code ra console/logs giống MediaCrawler.
  - `[x]` Bổ sung đăng nhập bằng Cookie (`loginByCookies`) nạp cookies vào trình duyệt và xác thực.
 
- `[x]` **Bước 3: Tích hợp và đồng bộ hóa vòng đời Client trong `src/crawl/bilibili/core.ts`**
  - `[x]` Đảm bảo khi khởi tạo `BilibiliCrawler.start()`, kiểm tra trạng thái qua `pong()`. Nếu thất bại, chạy `BilibiliLogin` để lấy cookie mới, lưu cookie vào file session, rồi đóng trình duyệt ngay lập tức.
  - `[x]` Thực hiện các tác vụ cào (search, creator, detail, comment) thuần túy qua HTTP Client.
 
- `[x]` **Bước 4: Chạy thử nghiệm và xác minh (Dry Run)**
  - `[x]` Chạy thử nghiệm cào chi tiết video (detail).
  - `[x]` Chạy thử nghiệm cào bình luận (comments).
  - `[x]` Chạy thử nghiệm cào creator profile.
  - `[x]` Chạy thử nghiệm cào tìm kiếm (search).

- `[x]` **Bước 5: Thiết kế và tích hợp Hệ thống Xoay vòng Tài khoản (Account Rotation Pool)**
  - `[x]` Tạo bảng `crawler_accounts` trong Supabase.
  - `[x]` Hiện thực hóa luồng Checkout/Checkin và cơ chế tự động khóa tài khoản lỗi trong `src/store/account_pool.ts`.
  - `[x]` Tích hợp vào `ensureLogin()` của crawler core và bọc các tác vụ cào để báo cáo kết quả.
  - `[x]` Bổ sung CLI command `add-account` và hỗ trợ nạp cookie từ tệp JSON hoặc chuỗi raw.
  - `[x]` Cấu hình bảo mật khóa API quản trị qua `supabase/.env.local`.

