# Decision Log — remove-bg

## 2026-06-21 — Khởi tạo dự án và cấu hình workspace  [initiative: feat-removebg-tool]
- Bối cảnh: Khởi tạo dự án tách nền ảnh sử dụng PhotoRoom API.
- Phương án đã cân nhắc: Không.
- Chọn cấu trúc .agents chuẩn theo workspace guideline vì giúp quản lý dự án hiệu quả.

## 2026-06-21 — Thiết kế cơ chế quản lý API Key & Xoay tua  [initiative: feat-removebg-tool]
- Bối cảnh: Cần nạp API Key bảo mật, linh hoạt cho AI Agent gọi tự động và cho phép sử dụng nhiều key phòng hờ lỗi quota/rate-limit.
- Phương án đã cân nhắc: 
  - Chỉ dùng tham số CLI.
  - Chỉ dùng biến môi trường.
  - Chỉ dùng file config.
- Quyết định: Chọn phương án kết hợp đa tầng (Multi-layered fallback) và hỗ trợ Key Rotation (mảng API keys trong file cấu hình/biến môi trường). Script PowerShell sẽ tự động xoay tua sang key tiếp theo nếu gặp lỗi HTTP 429/quota từ PhotoRoom API.
