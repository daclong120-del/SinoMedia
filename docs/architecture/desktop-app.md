# SinoMedia Desktop Runtime Package

Tài liệu này mô tả kiến trúc đóng gói của **SinoMedia Desktop Runtime Package**. Mục tiêu là biến `desktop-app/` thành hệ thống đóng gói độc lập, gom các module từ project chính thành artifact có thể chạy trực tiếp mà người dùng không phải cài đặt môi trường (Node/Rust/npm).

---

## 1. Kiến trúc hệ thống

```text
desktop-app
├─ build system
│  ├─ copy/extract dashboard artifact
│  ├─ copy/extract crawler-pipeline artifact
│  ├─ package embedded runtime
│  └─ generate release folder
│
├─ runtime
│  ├─ dashboard server (Next.js standalone)
│  ├─ worker launcher (Crawler Worker)
│  ├─ downloader launcher (Tương lai)
│  └─ config loader
│
├─ app shell
│  ├─ mở UI
│  ├─ start/stop local services
│  └─ show status/logs
│
└─ release
   └─ SinoMedia Desktop/
      ├─ SinoMedia.exe
      ├─ app/
      ├─ worker/
      ├─ runtime/
      ├─ config/
      ├─ logs/
      └─ data/
```

## 2. Các thành phần chính

### Build System
Chịu trách nhiệm sao chép, trích xuất và đóng gói các module cần thiết từ repo chính (dashboard, crawler-pipeline) vào thư mục release.

### Runtime
Cung cấp môi trường chạy độc lập cho các service cục bộ (Dashboard, Worker) thông qua các launcher được cấu hình sẵn. Môi trường này sẽ được nhúng sẵn (embedded) để người dùng không cần cài thêm dependency.

### App Shell
Giao diện (UI) chính của Desktop App. Đóng vai trò là control panel để mở giao diện quản lý, khởi động/dừng các dịch vụ (dashboard, worker) cục bộ và xem trạng thái/logs.

---

## 3. Trạng thái phát triển
- **Định hướng cũ (Pake Draft):** Bọc `localhost:3000` đang chạy sẵn trên máy (Đã loại bỏ).
- **Định hướng mới (Desktop Runtime Package):**
  - Đã có build script idempotent `build-runtime-package.ps1` tạo Scaffold & Full package.
  - Trích xuất thành công Dashboard Next.js standalone server và Crawler worker (`crawler-pipeline`), nhúng kèm Node.exe.
  - Tự động biên dịch Launcher C# (`SinoMedia.exe` từ `src/Launcher.cs` thông qua `csc.exe`).
  - Hỗ trợ static health-check và dynamic smoke-test (`health-check.ps1 -Smoke`) tự động kiểm chứng port, tiến trình và log lỗi.
  - Thư mục release `desktop-app/release/` đã được cấu hình trong `.gitignore` để tránh commit tài nguyên nặng.
