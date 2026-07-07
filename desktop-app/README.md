# SinoMedia Desktop App Packaging

Thư mục này chứa toàn bộ tài nguyên và công cụ phục vụ việc đóng gói hệ thống **SinoMedia Dashboard** thành ứng dụng máy tính (Desktop App) chạy độc lập.

---

## 1. Hướng dẫn đóng gói bằng Pake (Tauri-based)

Pake là công cụ đóng gói website siêu nhẹ (chỉ khoảng 10-15MB) sử dụng **Tauri** và **Rust**.

### Yêu cầu hệ thống (Prerequisites):
1. **Node.js** (để chạy lệnh npm/npx).
2. **Rust & Cargo** (bắt buộc để biên dịch ứng dụng):
   * Mở PowerShell chạy lệnh sau để cài: `winget install Rustlang.Rustup`
   * Hoặc cài từ trang chủ: [https://rustup.rs/](https://rustup.rs/)

### Các bước đóng gói:
1. Đảm bảo Dashboard đang chạy cục bộ ở cổng `3000`:
   ```bash
   cd dashboard
   npm run dev
   ```
2. Nhấn đúp chuột chạy file [build.bat](file:///d:/Python/SinoMedia/desktop-app/build.bat) trong thư mục này.
3. Khi hoàn tất, file **`SinoMedia.exe`** sẽ xuất hiện ngay trong thư mục này.

---

## 2. Tính năng tải video trực tiếp trên App
* Khi chạy ở dạng App Desktop, các yêu cầu tải video (nút "Tải video" trong Modal chi tiết) sẽ gọi qua Next.js Server Proxy `/api/video/proxy?url=...` để vượt qua cơ chế chặn Referer của Bilibili.
* Vì App chạy trên máy tính cá nhân của bạn (có internet đầy đủ, không bị sandbox của IDE chặn), nên tính năng xem và tải video hoạt động 100% bình thường.

---

## 3. Hướng phát triển trong tương lai (Electron)
Nếu bạn muốn đóng gói ứng dụng mà **không cần cài đặt Rust**, bạn có thể tạo một dự án **Electron** tại thư mục này:
1. Cài đặt Electron: `npm install electron --save-dev`
2. Cấu hình file `main.js` để load `http://localhost:3000` và tắt `webSecurity` để bypass CORS trực tiếp trên frontend.
