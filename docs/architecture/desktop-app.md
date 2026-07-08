# Desktop App Packaging & Strategy

Hướng dẫn và chiến lược đóng gói SinoMedia Dashboard thành Desktop App.

## 1. Trạng thái hiện tại (Draft)
- **Công nghệ:** Đóng gói bằng Pake (Tauri-based) siêu nhẹ (10-15MB).
- **Trạng thái:** Mới chỉ là draft đóng gói Dashboard chạy ở cổng local `3000`. Chưa tích hợp Next.js server local hoặc worker control.
- **Tài nguyên:** Chi tiết tại [desktop-app/README.md](file:///d:/Python/SinoMedia/desktop-app/README.md).

## 2. Hướng dẫn đóng gói (Pake)
### Yêu cầu:
- **Rust & Cargo:** Cài qua `winget install Rustlang.Rustup` hoặc từ trang chủ.
- **Node.js**

### Các bước thực hiện:
1. Chạy Dashboard local: `cd dashboard && npm run dev`
2. Nhấn đúp file [build.bat](file:///d:/Python/SinoMedia/desktop-app/build.bat) ở thư mục `desktop-app/`.
3. Nhận file `SinoMedia.exe` tại thư mục đóng gói.

## 3. Kiến trúc tích hợp tương lai
- **Phát video Bilibili:** Dùng Embedded Iframe Player chính thức. Không tải video về R2 để phát.
- **Worker local:** Chạy như process/service riêng, claim task và báo cáo log về Supabase.
- **Video Downloader Service:** Tải video độc lập khi user yêu cầu file vật lý, tránh block crawler.
- **Giải pháp Electron (Không cần Rust):** Khởi tạo Electron dự án tại `desktop-app/`, cấu hình `main.js` tắt `webSecurity` để load `http://localhost:3000` và bypass CORS frontend.
