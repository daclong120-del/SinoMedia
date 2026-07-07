# 📐 Thiết kế Kỹ thuật Phase 1 — Bilibili Crawler Hybrid
 
Tài liệu này đặc tả luồng kỹ thuật cào dữ liệu Bilibili theo mô hình lai chuẩn (HTTP-first, cô lập trình duyệt).
 
## 1. Luồng Gửi Yêu cầu (Request Flow)
 
Mô hình hoạt động của HTTP Client cho Bilibili:
 
```text
Khởi tạo Bilibili Crawler
     │
     ▼
Đọc cookie cấu hình (env hoặc bilibili_session.json)
     │
     ▼
Kiểm tra đăng nhập: API GET /x/web-interface/nav
     │
     ├──► Thành công? (Đã đăng nhập)
     │         │
     │         ▼
     │   Trích xuất WBI keys và bắt đầu cào qua HTTP Client (Impit / fetch)
     │
     └──► Thất bại? (Chưa đăng nhập / Hết hạn)
               │
               ▼
         [Khởi chạy CloakBrowser]
               │
               ▼
         Thực hiện luồng đăng nhập (Cookie / QR Code)
               │
               ▼
         Lấy cookie thực từ trình duyệt và lưu vào bilibili_session.json
               │
               ▼
         Đóng trình duyệt ngay lập tức (Giải phóng RAM)
               │
               ▼
         Tiếp tục cào bằng HTTP Client
```
 
## 2. Các Thay đổi Kỹ thuật Chính
 
### A. Quản lý Session Cookie
- Cookie đầu vào được nạp theo thứ tự ưu tiên:
  1. `process.env.BILIBILI_COOKIE`.
  2. `output/bilibili_session.json` (tệp lưu session từ lần chạy trước).
- Nếu đăng nhập qua trình duyệt thành công, cookie mới nhất được xuất ra và ghi đè vào `output/bilibili_session.json` (tránh ghi đè nếu dùng `process.env.BILIBILI_COOKIE` trực tiếp).
 
### B. Đồng bộ hóa API Client Bilibili
- API client (`BilibiliClient`) sử dụng `impit` (hoặc native fetch) làm phương thức giao tiếp chính.
- `bilibiliRequest` chịu trách nhiệm gửi request HTTP kèm Cookie và các tham số WBI đã ký.
- Không sử dụng `page.goto` trên trình duyệt cho các liên kết video/creator đơn lẻ.
 
### C. Ký Chữ ký WBI cục bộ
- Tự động lấy `img_key` và `sub_key` qua API `/x/web-interface/nav` của client.
- Thực hiện thuật toán trộn muối và sắp xếp tham số cục bộ trên Node.js để sinh ra chữ ký `w_rid` và `wts` trước khi truyền vào API yêu cầu.
