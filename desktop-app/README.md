# SinoMedia Desktop Runtime Package

Thư mục này là **packaging workspace** phục vụ việc đóng gói hệ thống SinoMedia thành một ứng dụng máy tính (Desktop App) chạy độc lập. 
Mục tiêu là tạo ra một hệ thống đóng gói có thể gom các module từ project chính thành artifact có thể chạy mà người dùng không phải cài Node/Rust/npm thủ công.

---

## 1. Trạng thái hiện tại (Packaging Workspace)

Hiện tại thư mục này đóng vai trò là workspace định nghĩa các tài liệu/build spec (hợp đồng đóng gói) trước khi triển khai script build thật.
Các giải pháp trước đây (như Pake CLI bọc `localhost:3000`) chỉ là draft/thử nghiệm shell ban đầu và **đã bị thay thế** bởi định hướng Desktop Runtime Package.

**Kiến trúc build hướng tới:**
1. Trích xuất module từ repo chính (Dashboard, Crawler, Config).
2. Đóng gói runtime (Node/Electron/Tauri tuỳ phase) đi kèm.
3. Tạo ra cấu trúc thư mục release chạy được ngay.

---

## 2. Hợp đồng đóng gói (Contracts)

Để đảm bảo tính độc lập và khả năng mở rộng, quá trình build phải tuân thủ 2 hợp đồng chính:
- [Module Extraction Contract](./MODULE_EXTRACTION_CONTRACT.md): Quy định cách trích xuất các module từ project gốc.
- [Build Artifact Contract](./BUILD_ARTIFACT_CONTRACT.md): Quy định cấu trúc đầu ra sau khi build.

---

## 3. Lựa chọn công nghệ App Shell (Tương lai)

Khi tiến hành viết build script, shell của ứng dụng sẽ được chọn giữa:
- **Tauri**: Nhẹ, sạch, phù hợp app desktop nghiêm túc, nhưng build pipeline phức tạp hơn (cần Rust).
- **Electron**: Nặng hơn, nhưng dễ bundle Node/dashboard/worker hơn, phù hợp giai đoạn build nhanh và tương thích cao.

Ưu tiên hiện tại là hoàn thiện Contract, chưa đụng vào source code ứng dụng chính.
