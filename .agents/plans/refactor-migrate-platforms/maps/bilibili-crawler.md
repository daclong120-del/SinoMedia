# 🗺️ Cây Quyết định Chi tiết (à, nghĩa là...) — Bilibili Crawler Hybrid
 
Cây quyết định chi tiết này định hình lại kiến trúc Bilibili Crawler sang mô hình lai chuẩn (HTTP-first, cô lập trình duyệt chỉ cho đăng nhập và đồng bộ cookie/session).
 
## 🌳 Cây Quyết định "à, nghĩa là..."
 
### 1. HTTP-First Request (Loại bỏ cào bằng trình duyệt)
- **Mục tiêu**: Không điều hướng trình duyệt qua từng link chi tiết video/creator/comment để tiết kiệm tài nguyên.
- **Cây quyết định**:
  - Không cào bằng trình duyệt...
    - ↳ à, nghĩa là loại bỏ hoàn toàn `page.goto(targetWebUrl)` và `page.evaluate(fetch)` bên trong hàm `bilibiliRequest` cho từng request API.
    - ↳ à, nghĩa là toàn bộ các request lấy chi tiết video, danh sách video creator, tìm kiếm video, và phân trang bình luận đều chạy qua HTTP client (`impit` hoặc native fetch).
    - ↳ à, nghĩa là nếu một request HTTP trả về mã lỗi khác 0 hoặc lỗi mạng, ta sẽ ném lỗi `DataFetchError` để tầng trên thực hiện retry hoặc ghi nhận lỗi, chứ không fallback sang trình duyệt để điều hướng.
 
### 2. Quản lý Đăng nhập & Session Cookie (CloakBrowser độc lập)
- **Mục tiêu**: Chỉ chạy trình duyệt khi cần xác thực/đồng bộ cookie.
- **Cây quyết định**:
  - Tách biệt vai trò của trình duyệt...
    - ↳ à, nghĩa là trình duyệt (CloakBrowser) chỉ khởi chạy khi cookie hiện hành chưa hợp lệ hoặc `pong()` trả về thất bại (chưa đăng nhập).
    - ↳ à, nghĩa là khi trình duyệt chạy, nó sẽ nạp cookie từ cấu hình/session, mở trang chủ Bilibili để hoàn tất đăng nhập (hoặc hiện QR code để người dùng quét), sau đó trích xuất cookie thực tế lưu lại vào `output/bilibili_session.json` và đóng trình duyệt ngay lập tức.
    - ↳ à, nghĩa là các lượt chạy cào tiếp theo sẽ sử dụng trực tiếp cookie trong `bilibili_session.json` để gửi request HTTP mà không cần bật trình duyệt lên.
 
### 3. Ký chữ ký WBI (Local signing)
- **Mục tiêu**: Tạo chữ ký WBI cục bộ nhanh chóng mà không cần gọi trình duyệt.
- **Cây quyết định**:
  - Thực hiện ký WBI cục bộ...
    - ↳ à, nghĩa là hàm `getWbiSign` sẽ được gọi cục bộ trong Node.js để sinh chữ ký `w_rid` và timestamp `wts`.
    - ↳ à, nghĩa là WBI keys (`imgKey` và `subKey`) sẽ được lấy bằng cách gửi request HTTP đến `/x/web-interface/nav`.
    - ↳ à, nghĩa là chỉ khi API `/x/web-interface/nav` bị chặn và không có keys, ta mới khởi chạy trình duyệt để trích xuất `wbi_img_urls` từ `localStorage` của trang chủ Bilibili.
