Cách xử lý của **MediaCrawler** (`ChinaMediaCrawler`) đối với nền tảng Bilibili hoạt động theo quy trình phối hợp cực kỳ chặt chẽ giữa Trình duyệt và HTTP Client như sau:

### 1. Khởi tạo Trình duyệt và Lấy Cookie ban đầu (Một lần duy nhất)
- Khi bắt đầu (`BilibiliCrawler.start`), MediaCrawler mở trình duyệt Playwright và điều hướng trang web đến trang chủ `https://www.bilibili.com` để tạo ngữ cảnh phiên (session context).
- Nó trích xuất toàn bộ cookie từ `browser_context` này, chuyển đổi thành chuỗi cookie và truyền sang cho đối tượng HTTP Client (`BilibiliClient`).

### 2. Kiểm tra Trạng thái Phiên (Handshake - `pong`)
- Hệ thống gửi một request HTTP `/x/web-interface/nav` bằng HTTP Client để kiểm tra xem cookie hiện tại có sử dụng được không.
- Nếu không thành công (chưa đăng nhập hoặc cookie hết hạn), nó sẽ kích hoạt `BilibiliLogin` trên trình duyệt để hướng dẫn đăng nhập (quét mã QR) hoặc lấy cookie mới, sau đó cập nhật lại cookie sang HTTP Client.

### 3. Lấy Khóa Ký WBI (`wbi_img_urls`)
- Để gọi các API của Bilibili mà không bị chặn, các tham số bắt buộc phải được ký bằng thuật toán WBI.
- MediaCrawler lấy `wbi_img_urls` bằng cách đọc từ `localStorage` của trình duyệt đang mở (hoặc gọi API `/x/web-interface/nav` thông qua HTTP client).
- Từ URL này, nó trích xuất ra `img_key` và `sub_key` dùng làm khóa muối (salt) cho thuật toán ký chữ ký.

### 4. Ký Tham Số và Request bằng HTTP Client
- Trước mỗi request, lớp `BilibiliSign` sẽ ký các tham số query bằng `img_key` và `sub_key` để tạo ra tham số chữ ký `w_rid` và dấu thời gian `wts`.
- **Thực hiện cào dữ liệu**: Tất cả các hành động tìm kiếm, lấy chi tiết video (`get_video_info`), bình luận (`get_video_all_comments`) đều sử dụng **HTTP Client** (`httpx` hoặc `curl_cffi` để giả lập TLS/JA3) để gửi trực tiếp request đi kèm cookie và các tham số đã ký.
- **Trình duyệt hoàn toàn không di chuyển**: Trình duyệt chỉ đứng yên ở trang chủ để giữ phiên/cung cấp khóa ký, tuyệt đối không chuyển hướng (`page.goto`) hay load lại từng trang video để cào dữ liệu.