# Crawler Optimization

> Tổng hợp kiến thức về tối ưu hóa crawler và chống rò rỉ RAM/băng thông trong dự án.
> Cập nhật lần cuối: 2026-07-02

---

## Architecture

### Browser Context Lifecycle Management
- **Ngày**: 2026-07-02
- **Chi tiết**: Do chạy trên VPS cấu hình thấp (2GB RAM), việc duy trì trình duyệt lâu dài sẽ gây tràn bộ nhớ (leak). Ta triển khai bộ đếm lượt tải trang (`pageLoadCount`) và tự động giải phóng trình duyệt (`closeBrowser`) sau 50 trang. Biến toàn cục sẽ tự động khởi tạo lại instance mới cho lượt tiếp theo.
- **Files liên quan**: `crawler-pipeline/src/crawl/client.ts`

---

## Bugs & Solutions

### Trình duyệt đóng giữa chừng khi evaluate
- **Ngày**: 2026-07-02
- **Vấn đề**: Gọi recycle browser (`incrementPageLoad`) trong `finally` của `page.goto` làm trình duyệt bị đóng trước khi `page.evaluate` lấy dữ liệu `RENDER_DATA`.
- **Root cause**: `finally` của block chuyển trang chạy trước logic trích xuất DOM của hàm cha `douyinRequest`.
- **Fix**: Di chuyển `incrementPageLoad` xuống block `finally` ngoài cùng của `douyinRequest`, đảm bảo toàn bộ quá trình trích xuất DOM hoàn tất trước khi recycle.
- **Files liên quan**: `crawler-pipeline/src/crawl/client.ts`

---

## How-To

### Đồng bộ Client Hints
- **Ngày**: 2026-07-02
- **Bước thực hiện**:
  1. Trích xuất nền tảng hệ điều hành và phiên bản Chrome từ `User-Agent` đang hoạt động.
  2. Tạo header tương ứng (`sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform`).
  3. Gửi kèm trong headers của HTTP request qua client.
- **Files liên quan**: `crawler-pipeline/src/crawl/client.ts`

---

## Patterns

### Bulk-Upsert và Cache Author
- **Ngày**: 2026-07-02
- **Chi tiết**: Để tối ưu hiệu năng ghi DB của Supabase:
  1. Cache `authorUuid` trước khi cào danh sách để không phải upsert author cho từng video.
  2. Thu thập kết quả cào của toàn bộ trang vào mảng `CrawledPostRow[]` qua `persistAweme` có cờ `skipDbWrite: true`.
  3. Gọi bulk-upsert `upsertPosts(posts)` một lần duy nhất cho mỗi trang.
- **Files liên quan**: `crawler-pipeline/src/crawl/douyin.ts`, `crawler-pipeline/src/store/supabase_writer.ts`
