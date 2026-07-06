# Roadmap — feat-removebg-tool

Initiative này xây dựng một công cụ PowerShell (`remove-bg.ps1`) dùng PhotoRoom API để tách nền ảnh nhanh chóng, đơn giản cho AI Agent và hỗ trợ xoay tua nhiều API key (Key Rotation).

## 📍 Đang làm
- Phase: Tất cả 3 phase ✅ — initiative đã hoàn tất nghiệm thu
- Item: Không còn việc mở
- Bước kế: Bàn giao / không còn

## 📊 Tiến độ tổng thể
- **Trạng thái**: ✅ Đã xong
- **Tiến độ**: 3/3 phase hoàn thành
- **Marker**: ⏳ chưa · 🔄 đang làm · ✅ xong · ⛔ chặn

## ❓ Câu hỏi mở / Ghi chú nhanh
- Không còn câu hỏi mở. Hỗ trợ Key Rotation (nhiều API key xoay tua khi lỗi rate-limit/quota); đầu vào/đầu ra đơn giản cho AI Agent.

---

## 📌 Danh sách các Phase

### Phase 1: Khởi động & Cấu hình môi trường (Isolated Environment)
- **Trạng thái**: ✅ đã xong
- **Mục tiêu**: Thiết lập cấu trúc thư mục, tệp cấu hình và viết tập lệnh PowerShell khung (`remove-bg.ps1`) nhận diện tham số và nạp danh sách API Key.
- **Đầu vào**: Yêu cầu cấu hình.
- **Đầu ra**: 
  - Khung tập lệnh `remove-bg.ps1` xử lý tham số `-InputPath`, `-OutputPath`, `-ApiKey`.
  - Tệp cấu hình mẫu `config.json` hỗ trợ danh sách `api_keys` (mảng).
- **Các bước thực hiện**:
  1. Tạo file cấu hình `config.json` cục bộ chứa mảng API Keys.
  2. Viết khung PowerShell nhận diện tham số, đọc file cấu hình và nạp các key khả dụng.
  3. Kiểm tra tính hợp lệ của ảnh đầu vào (sự tồn tại của file, định dạng ảnh).

### Phase 2: Thực hiện tách nền & Xoay tua API Key (API Integration & Rotation)
- **Trạng thái**: ✅ đã xong
- **Mục tiêu**: Hiện thực hóa việc kết nối với PhotoRoom API (`/v1/segment`) và tự động chuyển sang API key tiếp theo nếu gặp lỗi quota/rate-limit.
- **Đầu vào**: Khung script từ Phase 1 và thông tin PhotoRoom API.
- **Đầu ra**: Tập lệnh `remove-bg.ps1` hoàn chỉnh có khả năng tách nền và tự động đổi key khi lỗi.
- **Các bước thực hiện**:
  1. Xây dựng hàm gửi HTTP POST Multipart Form-Data trong PowerShell để upload ảnh.
  2. Xử lý phản hồi từ API (lưu byte ảnh trả về hoặc parse lỗi).
  3. Hiện thực hóa logic xoay tua API Key: Nếu gặp lỗi HTTP 429 hoặc lỗi liên quan đến quota của key hiện tại, tự động chuyển sang key tiếp theo trong danh sách và gửi lại request.
  4. Ghi log hoạt động chi tiết bằng tiếng Việt có dấu.

### Phase 3: Tài liệu hướng dẫn AI & Kiểm thử (Documentation & Testing)
- **Trạng thái**: ✅ đã xong
- **Mục tiêu**: Viết tài liệu `README.md` tối ưu cho AI Agent sử dụng công cụ và chạy các kịch bản kiểm thử (integration test).
- **Đầu vào**: Tập lệnh `remove-bg.ps1` hoàn chỉnh từ Phase 2.
- **Đầu ra**:
  - File `README.md` chi tiết tại thư mục gốc của dự án.
  - Bộ test script kiểm thử tự động / hướng dẫn chạy thử bằng tay.
- **Các bước thực hiện**:
  1. Tạo tài liệu `README.md` mô tả rõ ràng: mục đích, cách cài đặt môi trường, cú pháp chạy, cấu trúc file config, danh sách các mã lỗi và cách AI Agent gọi lệnh.
  2. Tạo script kiểm thử tự động `test-remove-bg.ps1` chạy thử với ảnh mẫu.
  3. Hoàn thiện dự án và nghiệm thu.
