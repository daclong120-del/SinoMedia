# Cây "À, nghĩa là..." cho việc tối ưu hóa Crawler (Phase 2)

## 1. Đồng bộ TLS Fingerprint & Bổ sung Client Hints
- **[Client Hints động]**
  - à, nghĩa là phân tích `User-Agent` hiện tại thông qua regex
  - à, nghĩa là xác định hệ điều hành (Windows, macOS, Linux, iOS, Android) và phiên bản Chrome chính (major version)
  - à, nghĩa là tạo các header `sec-ch-ua`, `sec-ch-ua-mobile`, và `sec-ch-ua-platform` đồng bộ với User-Agent đó
  - à, nghĩa là truyền các headers này vào mọi request đi qua `impit` và trình duyệt fallback

## 2. Ngăn ngừa rò rỉ RAM (Browser Context Recycle)
- **[Tự động Recycle Trình duyệt]**
  - à, nghĩa là đếm số lượng trang đã được tải qua `page.goto` trong `client.ts`
  - à, nghĩa là khi đạt ngưỡng (ví dụ: 50 trang), ta gọi `closeBrowser()` để giải phóng toàn bộ RAM của tiến trình Chrome
  - à, nghĩa là trong `getBrowserPage()`, nếu `browserPage` đã bị giải phóng (là `null`), ta tự động tạo mới trình duyệt ở request tiếp theo một cách trong suốt
  - à, nghĩa là trước khi tắt trình duyệt, đảm bảo cookies/session hiện tại đã được đồng bộ vào file lưu trữ `session_store.js` để tránh mất phiên đăng nhập

## 3. Loại bỏ Hardcoded Sleep khi chờ DOM
- **[Chờ DOM thông minh]**
  - à, nghĩa là thay vì `sleep(2000)` mù quáng, ta chờ selector/dữ liệu cụ thể xuất hiện trên DOM
  - à, nghĩa là dùng `page.waitForFunction` kiểm tra thẻ `document.getElementById('RENDER_DATA')` có nội dung và không rỗng
  - à, nghĩa là bọc khối lệnh chờ trong block `try...catch` hoặc `.catch(...)` để tránh crashing toàn bộ tiến trình khi gặp timeout (ví dụ: do mạng chậm)

## 4. Tối ưu hiệu năng ghi DB (Bulk-Upsert)
- **[Bulk-Upsert và Cache Author]**
  - à, nghĩa là trong `crawlCreator`, ta đã có `authorUuid` ngay từ đầu, nên truyền trực tiếp `authorUuid` vào `persistAweme` để bỏ qua việc `upsertAuthor` dư thừa cho mỗi video
  - à, nghĩa là cho phép `persistAweme` chuẩn bị đối tượng `CrawledPostRow` và trả về, hoặc ghi trực tiếp tùy chọn (`skipDbWrite`)
  - à, nghĩa là thêm hàm `upsertPosts` nhận mảng các bài viết và thực hiện bulk-upsert thông qua Supabase API
  - à, nghĩa là lưu toàn bộ posts cào được theo từng trang (18 video) rồi thực hiện bulk-upsert một lần để giảm thiểu request network tới Supabase DB
