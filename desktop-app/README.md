# SinoMedia Desktop Runtime Package

Thư mục này là **packaging workspace** phục vụ việc đóng gói hệ thống SinoMedia thành một ứng dụng máy tính (Desktop App) chạy độc lập. 
Mục tiêu là tạo ra một hệ thống đóng gói có thể gom các module từ project chính thành artifact có thể chạy mà người dùng không phải cài Node/Rust/npm thủ công.

---

## 1. Trạng thái hiện tại (Packaging Workspace)

Hiện tại, workspace đã triển khai thành công hệ thống build script và kiểm chứng thực tế (**Build scaffold & Full extraction bước đầu**).
Các giải pháp cũ (như Pake CLI bọc `localhost:3000`) đã hoàn toàn bị loại bỏ để chuyển sang kiến trúc Desktop Runtime Package tự cung cấp (self-contained).

**Các phần đã hoàn thiện:**
1. **Idempotent Build Script (`build-runtime-package.ps1`)**: Hỗ trợ build `Scaffold` (chỉ cấu trúc) và `Full` (trích xuất dashboard standalone Next.js server, crawler worker và node.exe). Hỗ trợ dọn dẹp an toàn (`-Clean`).
2. **Embedded Runtime**: Nhúng Node.exe trực tiếp từ hệ thống vào thư mục release để chạy độc lập.
3. **Launcher Scripts**:
   - `start-dashboard.ps1`: Chạy dashboard server Next.js standalone ngầm.
   - `start-worker.ps1`: Chạy crawler worker ngầm bằng node gọi `tsx` entrypoint.
   - `stop-services.ps1`: Kill các dịch vụ an toàn qua file PID (đã sanitize ký tự BOM/newline) kèm quét dọn fallback.
4. **Health Check & Smoke Test (`health-check.ps1`)**: Hỗ trợ quét bảo mật rò rỉ key Supabase, verify các file/thư mục và chạy **Smoke Test (`-Smoke`)** tự động boot services -> kiểm tra kết nối port 3000 -> kiểm tra PID worker -> tắt an toàn.

---

## 2. Hướng dẫn vận hành

Mở PowerShell tại thư mục `desktop-app/` và chạy các lệnh tương ứng:

### A. Build Package
- **Tạo khung cấu trúc (Scaffold Mode)**:
  ```powershell
  PowerShell -ExecutionPolicy Bypass -File .\scripts\build-runtime-package.ps1 -Mode Scaffold
  ```
- **Tạo bản build đầy đủ (Full Mode)**:
  ```powershell
  PowerShell -ExecutionPolicy Bypass -File .\scripts\build-runtime-package.ps1 -Mode Full
  ```
- **Dọn dẹp trước khi build**:
  ```powershell
  PowerShell -ExecutionPolicy Bypass -File .\scripts\build-runtime-package.ps1 -Mode Full -Clean
  ```

### B. Kiểm tra sức khỏe (Health Check & Smoke Test)
- **Kiểm tra tĩnh cấu trúc file & bảo mật**:
  ```powershell
  PowerShell -ExecutionPolicy Bypass -File .\scripts\health-check.ps1
  ```
- **Smoke test khởi chạy thực tế các dịch vụ**:
  ```powershell
  PowerShell -ExecutionPolicy Bypass -File .\scripts\health-check.ps1 -Smoke
  ```

---

## 3. Hợp đồng đóng gói (Contracts)

Để đảm bảo tính độc lập và khả năng mở rộng, quá trình build tuân thủ 2 hợp đồng chính:
- [Module Extraction Contract](./MODULE_EXTRACTION_CONTRACT.md): Quy định cách trích xuất các module từ project gốc.
- [Build Artifact Contract](./BUILD_ARTIFACT_CONTRACT.md): Quy định cấu trúc đầu ra sau khi build.

---

## 4. Lựa chọn công nghệ App Shell (Bước tiếp theo)

Khi tiến hành viết wrapper app shell, shell của ứng dụng sẽ được chọn giữa:
- **Tauri**: Nhẹ, sạch, phù hợp app desktop nghiêm túc, nhưng build pipeline phức tạp hơn (cần Rust).
- **Electron**: Nặng hơn, nhưng dễ bundle Node/dashboard/worker hơn, phù hợp giai đoạn build nhanh và tương thích cao.
- **Script/Batch Launcher**: Phương án fallback hiện tại chạy hoàn hảo thông qua các script launcher PowerShell.
