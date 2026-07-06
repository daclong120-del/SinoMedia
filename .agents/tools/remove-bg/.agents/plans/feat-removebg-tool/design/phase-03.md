# Thiết kế Chi tiết Phase 3 — Tài liệu hướng dẫn AI & Kiểm thử

Tài liệu này mô tả thiết kế của Phase 3 nhằm hoàn thiện công cụ: viết tài liệu hướng dẫn tối ưu cho AI Agent (`README.md`) và xây dựng tệp tin kiểm thử tích hợp tự động (`test-remove-bg.ps1`).

## 1. Mục tiêu & Ý tưởng thiết kế

### Tài liệu `README.md`:
- Cung cấp hướng dẫn trực quan để AI Agent có thể đọc hiểu và sử dụng công cụ một cách độc lập.
- Nêu rõ các tham số đầu vào (`-InputPath`, `-OutputPath`, `-ApiKey`).
- Mô tả định dạng file cấu hình `config.json`.
- Định nghĩa rõ quy ước trả về: dòng cuối cùng in ra stdout sẽ là đường dẫn tệp ảnh kết quả đã được xử lý.
- Giải thích các exit code để AI Agent có thể bắt lỗi.

### Cơ chế tự động dọn dẹp (Auto-Cleanup):
- Mặc định, nếu không truyền `-OutputPath`, kết quả tách nền sẽ được lưu vào thư mục `temp_outputs/` (tạo tự động trong thư mục gốc của script).
- Mỗi lần chạy script, hệ thống sẽ quét thư mục `temp_outputs/` này và tự động xóa các file kết quả cũ hơn **30 phút** (giá trị mặc định, có thể cấu hình thông qua khóa `"cleanup_expiry_minutes"` trong `config.json`).
- Việc này giúp tránh tích tụ file rác khi AI Agent hoặc hệ thống gọi API liên tục.

### Tập lệnh kiểm thử `test-remove-bg.ps1`:
- Tự động hóa việc chạy tích hợp end-to-end.
- Kiểm tra tính đúng đắn của việc nạp key, kiểm tra file tồn tại, cơ chế auto-cleanup, và xác nhận file ảnh output được tạo ra đúng vị trí.

---

## 2. Chi tiết cấu trúc tệp tin kiểm thử (`test-remove-bg.ps1`)

Script kiểm thử sẽ thực hiện các bước sau:
1. Đảm bảo file ảnh mẫu `test.png` tồn tại (nếu chưa có, tự động báo lỗi hoặc hướng dẫn sinh).
2. Chạy `remove-bg.ps1` với ảnh mẫu.
3. Kiểm tra xem file kết quả `test_nobg.png` có được tạo ra không.
4. Đọc dòng cuối cùng của đầu ra script và kiểm tra xem nó có khớp với đường dẫn thực tế của file kết quả hay không.
5. In ra kết quả kiểm thử `PASS` hoặc `FAIL` rõ ràng.

---

## 3. Cách thức chạy thử nghiệm (Verification)

Sau khi hoàn tất cài đặt Phase 3, người dùng hoặc AI Agent có thể chạy kiểm thử chỉ bằng một câu lệnh:
```powershell
powershell -ExecutionPolicy Bypass -File .\test-remove-bg.ps1
```
