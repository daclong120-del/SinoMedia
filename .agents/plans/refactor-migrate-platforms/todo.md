# 📋 Checklist Triển khai Phase 1 — Bilibili Crawler Hybrid
 
Tệp này liệt kê chi tiết các công việc cần thực hiện để hoàn tất Phase 1 theo mô hình hybrid chuẩn.
 
- `[ ]` **Bước 1: Tái cấu trúc `src/crawl/bilibili/client.ts` (HTTP-First chuẩn)**
  - `[ ]` Gỡ bỏ toàn bộ logic điều hướng trình duyệt `page.goto` và `page.evaluate` fetch trong `bilibiliRequest`.
  - `[ ]` Đảm bảo `bilibiliRequest` sử dụng HTTP client (`impit`/fetch) và ném lỗi `DataFetchError` nếu lỗi.
  - `[ ]` Triển khai hàm `getWbiKeys()` gọi API `/x/web-interface/nav` qua HTTP, fallback qua localStorage trình duyệt chỉ khi HTTP bị chặn.
 
- `[ ]` **Bước 2: Triển khai hoàn thiện luồng đăng nhập trong `src/crawl/bilibili/login.ts`**
  - `[ ]` Bổ sung hỗ trợ đăng nhập QR Code (`loginByQrcode`) hiển thị QR code ra console/logs giống MediaCrawler.
  - `[ ]` Bổ sung đăng nhập bằng Cookie (`loginByCookies`) nạp cookies vào trình duyệt và xác thực.
 
- `[ ]` **Bước 3: Tích hợp và đồng bộ hóa vòng đời Client trong `src/crawl/bilibili/core.ts`**
  - `[ ]` Đảm bảo khi khởi tạo `BilibiliCrawler.start()`, kiểm tra trạng thái qua `pong()`. Nếu thất bại, chạy `BilibiliLogin` để lấy cookie mới, lưu cookie vào file session, rồi đóng trình duyệt ngay lập tức.
  - `[ ]` Thực hiện các tác vụ cào (search, creator, detail, comment) thuần túy qua HTTP Client.
 
- `[ ]` **Bước 4: Chạy thử nghiệm và xác minh (Dry Run)**
  - `[ ]` Chạy thử nghiệm cào chi tiết video (detail).
  - `[ ]` Chạy thử nghiệm cào bình luận (comments).
  - `[ ]` Chạy thử nghiệm cào creator profile.
  - `[ ]` Chạy thử nghiệm cào tìm kiếm (search).
