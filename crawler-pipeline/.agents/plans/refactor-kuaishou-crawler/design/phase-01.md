# Design — Phase 01: Kuaishou Crawler Migration

## Mục tiêu (người dùng được gì)
- Chuyển đổi và tích hợp thành công Kuaishou (快手) crawler từ Python codebase (`ChinaMediaCrawler`) sang TypeScript architecture (`crawler-pipeline`).
- Đảm bảo việc đăng nhập bằng cookie hoạt động chính xác.
- Hỗ trợ đầy đủ các tính năng:
  - `crawl`: Cào chi tiết video Kuaishou.
  - `creator`: Cào thông tin tác giả và danh sách video của họ.
  - `search`: Tìm kiếm video Kuaishou theo từ khóa.
  - `comments`: Cào các bình luận chính và bình luận con (sub-comments).

## Hành vi / use case
- Người dùng truyền lệnh cào với platform là `kuaishou`.
- Hệ thống thực hiện lấy cookie hợp lệ từ pool tài khoản hoặc từ cấu hình môi trường `KUAISHOU_COOKIE`.
- Thực hiện yêu cầu thông qua API GraphQL và REST V2 của Kuaishou.
- Tải tệp đa phương tiện (ảnh bìa, video) lên R2 storage.
- Lưu trữ tác giả, bài viết, bình luận tương thích với các bảng `crawled_authors`, `crawled_posts`, và `crawled_comments` trong Supabase.

## Hướng kỹ thuật đã chọn (+ vì sao)
- **Primary request mechanism: browser-evaluated fetch (`page.evaluate`)**: Do Kuaishou áp dụng cơ chế kiểm tra chữ ký (signature) rất nghiêm ngặt đối với các yêu cầu HTTP bên ngoài trình duyệt. Việc thực thi các hàm fetch trực tiếp trong trình duyệt Playwright hoạt động hiệu quả nhất do được thừa hưởng sẵn cookies, HTTP/2, TLS fingerprints, và tiêu đề tự nhiên của trình duyệt, giúp tránh hoàn toàn các khối anti-bot.
- **REST API V2 cho bình luận**: Kuaishou sử dụng GraphQL cho hầu hết các hoạt động ngoại trừ cào bình luận sử dụng REST API V2 (endpoint `/rest/v/photo/comment/list` và `/rest/v/photo/comment/sublist`), trả về trực tiếp định dạng JSON. Chúng ta sẽ port chính xác luồng này.
- **Đồng bộ hóa cookie**: Cập nhật cookie định kỳ từ BrowserContext vào API Client sau các thay đổi trạng thái hoặc điều hướng.

## Các bước thực thi
1. **Field & Type Definition**: Cập nhật `field.ts` để lưu trữ các kiểu dữ liệu và cấu hình tham số.
2. **Extractor**: Tạo `extractor.ts` chịu trách nhiệm làm sạch thẻ HTML, chuyển đổi thời gian (Kuaishou sử dụng timestamp mili giây nên chỉ cần `new Date(ts).toISOString()`), và map các thực thể Kuaishou sang schema Supabase.
3. **GraphQL Queries**: Đóng gói các GraphQL query của Kuaishou thành chuỗi hằng số (hoặc file riêng) trong client hoặc extractor để thực hiện POST request.
4. **KuaishouClient**: Viết lại API Client trong `client.ts` để thực hiện GraphQL/REST request thông qua `page.evaluate` kèm fallback node-fetch.
5. **KuaishouLogin**: Viết lại login flow bằng cookie trong `login.ts`, kiểm tra trạng thái login qua API `visionProfileUserList`.
6. **KuaishouCrawler**: Viết lớp điều phối chính trong `core.ts`, thực hiện checkout/checkin tài khoản từ cơ sở dữ liệu, tải tài nguyên ảnh/video lên R2 và cập nhật cơ sở dữ liệu Supabase.

## Edge case / rủi ro
- **Cookie hết hạn**: Được xử lý bằng cách ném ngoại lệ hoặc trả về trạng thái false khi kiểm tra `pong()`, từ đó kích hoạt cơ chế báo lỗi tài khoản hoặc thay thế tài khoản khác trong pool.
- **Không tìm thấy luồng video**: Kuaishou trả về manifest video dạng JSON chứa danh sách luồng video H264/H265. Cần phân tích manifest này để trích xuất URL dự phòng (`backupUrl`) hoặc URL trực tiếp (`url`).
