# TODO — feat-removebg-tool

Dự án đã hoàn thành toàn bộ các Phase! Hoàn tất nghiệm thu.

- `[ ]` uncompleted tasks
- `[/]` in progress tasks
- `[x]` completed tasks

---

## ✅ Phase 1: Khởi động & Cấu hình môi trường
- [x] Tạo file cấu hình mẫu `config.json` hỗ trợ mảng `api_keys`.
- [x] Tạo file `.gitignore` để bỏ qua việc commit file config chứa key thật (nếu có).
- [x] Xây dựng khung script `remove-bg.ps1` với khai báo tham số `[Parameter(Mandatory = $true)]`.
- [x] Viết hàm PowerShell đọc file `config.json` và tải mảng API Keys vào bộ nhớ.
- [x] Hiện thực logic kiểm tra hợp lệ của tập tin ảnh đầu vào (tồn tại file, định dạng ảnh).
- [x] Kiểm thử chạy thử khung script xem log hoạt động ban đầu (tiếng Việt có dấu).

## ✅ Phase 2: Thực hiện tách nền & Xoay tua API Key
- [x] Viết hàm tạo HTTP Request gửi ảnh (Multipart Form-Data) tới PhotoRoom API.
- [x] Xử lý phản hồi thành công và lưu file kết quả.
- [x] Hiện thực cơ chế xoay tua khóa API (Key Rotation) khi gặp HTTP status code 429 hoặc lỗi quota.
- [x] Xử lý và hiển thị thông báo lỗi chi tiết khi toàn bộ các key trong pool đều lỗi.

## ✅ Phase 3: Tài liệu hướng dẫn AI & Kiểm thử
- [x] Viết file `README.md` hướng dẫn AI Agent cách gọi script và cách xử lý khi xoay tua key thất bại.
- [x] Tạo script kiểm thử tự động `test-remove-bg.ps1` kiểm tra end-to-end.
- [x] Nghiệm thu toàn bộ dự án.
