# 🗺️ Bản đồ phân tích chi tiết "À, nghĩa là..." — Crawler Components

Bản đồ này phân tích chi tiết thiết kế và quyết định cho từng thành phần (deliverable) trong Phase 4 của pipeline cào dữ liệu Douyin/TikTok.

---

## 1. Module sinh chữ ký (`douyin.js` & `js_sign.ts`)

*   **Quyết định:** Port thuật toán ký từ `ChinaMediaCrawler` sang môi trường TypeScript để chạy hoàn toàn trong RAM của Node.js mà không cần browser hay python.
*   **Chi tiết "À, nghĩa là...":**
    *   *À, nghĩa là...* Cần sao chép tệp `douyin.js` từ `ChinaMediaCrawler` sang `src/crawler-pipeline/sign/douyin.js`.
    *   *À, nghĩa là...* Cần sử dụng module `vm` tích hợp sẳn của Node.js để chạy code JS này an toàn trong sandbox.
    *   *À, nghĩa là...* Môi trường sandbox `vm` cần được cấu hình các global objects cơ bản (`console`, `Date`, `Math`, `String`, `Array`, `Object`, `decodeURIComponent`, `encodeURIComponent`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`) để tránh lỗi thiếu biến khi code JS của Douyin chạy.
    *   *À, nghĩa là...* Cần xuất ra hai hàm tiện ích: `signDetail(params, userAgent)` và `signReply(params, userAgent)` để các worker gọi trực tiếp.
    *   *À, nghĩa là...* User-Agent truyền vào hàm sign bắt buộc phải trùng khớp với User-Agent sử dụng khi gửi request HTTP và User-Agent trong session cookie.

---

## 2. HTTP Client (`client.ts`)

*   **Quyết định:** Sử dụng native `fetch` của Node.js kết hợp với cookies đã lưu để gửi request.
*   **Chi tiết "À, nghĩa là...":**
    *   *À, nghĩa là...* Cần đọc cookie và `msToken` từ tệp `output/session.json` được tạo ra từ Phase 3.
    *   *À, nghĩa là...* Client cần xây dựng header chuẩn của Chrome: `User-Agent`, `Referer`, `Accept-Language`, `Cookie`, v.v.
    *   *À, nghĩa là...* Cần tự động cập nhật `msToken` vào tham số URL khi gửi request.
    *   *À, nghĩa là...* Cần hỗ trợ cấu hình proxy residential qua biến `CRAWLER_PROXY` trong môi trường nếu có.

---

## 3. Crawler Worker (`douyin.ts`)

*   **Quyết định:** Triển khai luồng cào video Douyin theo ID hoặc URL được chỉ định.
*   **Chi tiết "À, nghĩa là...":**
    *   *À, nghĩa là...* Cần parse lấy `aweme_id` (ID video) từ URL Douyin (hỗ trợ cả link modal và link thường).
    *   *À, nghĩa là...* Cần gọi API `/aweme/v1/web/aweme/detail/` với tham số `aweme_id` kèm theo chữ ký `a_bogus` được ký từ `js_sign.ts`.
    *   *À, nghĩa là...* Cần lấy URL video sạch không watermark hoặc URL chất lượng cao nhất từ danh sách `url_list`.
    *   *À, nghĩa là...* Cần tải file video và ảnh bìa (cover) về bộ đệm Buffer của Node.js trước khi tải lên Cloudflare R2.
    *   *À, nghĩa là...* Cần lấy thông tin tác giả (`author`) từ bài đăng để thực hiện lưu trữ thông tin tác giả trước khi lưu bài đăng.

---

## 4. Bộ lưu trữ media R2 (`r2_uploader.ts`)

*   **Quyết định:** Sử dụng `@aws-sdk/client-s3` để tương tác trực tiếp với Cloudflare R2.
*   **Chi tiết "À, nghĩa là...":**
    *   *À, nghĩa là...* Cần cài đặt `@aws-sdk/client-s3` vào `package.json` của `socialpeta-crawl`.
    *   *À, nghĩa là...* Cần khởi tạo `S3Client` với cấu hình endpoint R2 (`R2_ENDPOINT_URL`), key ID (`R2_ACCESS_KEY_ID`), secret key (`R2_SECRET_ACCESS_KEY`).
    *   *À, nghĩa là...* Quy ước lưu trữ tệp trên R2: `{platform}/{platform_uid_or_id}/{filename}` (ví dụ: `douyin/7471165520058862848/video.mp4`, `douyin/7471165520058862848/cover.jpg`) để giữ tính ngăn nắp và tránh ghi đè file của post khác.
    *   *À, nghĩa là...* Cần thiết lập `ContentType` chính xác khi upload (ví dụ `video/mp4`, `image/jpeg`) để trình duyệt/app di động sau này hiển thị trực tiếp thay vì tự động tải xuống.

---

## 5. Bộ ghi DB Supabase (`supabase_writer.ts`)

*   **Quyết định:** Gửi HTTP POST trực tiếp tới Supabase PostgREST API thông qua `service_role` key để tối giản RAM.
*   **Chi tiết "À, nghĩa là...":**
    *   *À, nghĩa là...* Cần gửi POST request đến bảng `crawled_authors` và `crawled_posts`.
    *   *À, nghĩa là...* Cần cấu hình tham số `?on_conflict=platform,platform_uid` (cho author) và `?on_conflict=platform,platform_id` (cho post) để thực hiện logic upsert.
    *   *À, nghĩa là...* Khi upsert author, cần truyền header `Prefer: return=representation` để nhận về dữ liệu phản hồi có chứa `id` (uuid) vừa tạo hoặc vừa cập nhật.
    *   *À, nghĩa là...* Cần dùng `id` của tác giả này điền vào trường `author_id` của bản ghi bài viết để tạo mối liên kết chính xác.
    *   *À, nghĩa là...* Sử dụng `SUPABASE_SERVICE_ROLE_KEY` trong header `apikey` và `Authorization` để vượt qua hoàn toàn RLS.
