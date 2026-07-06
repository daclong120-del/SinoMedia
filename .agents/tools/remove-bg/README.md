# Công cụ Tách Nền Ảnh (remove-bg)

Công cụ hỗ trợ tách nền ảnh tự động sử dụng **PhotoRoom API** qua PowerShell, tích hợp cơ chế xoay tua API Key (Key Rotation) khi quá hạn mức và tự động dọn dẹp file tạm để tránh tràn bộ nhớ.

---

## 🛠 Yêu cầu hệ thống
- Hệ điều hành: Windows.
- PowerShell 5.1 trở lên.
- Kết nối Internet.

---

## ⚙️ Cấu hình (Configuration)

Bạn có thể cấu hình API Key và cơ chế dọn dẹp thông qua file `config.json` nằm tại thư mục gốc của script.

Tạo file `config.json` (dựa trên mẫu `config.json.example`):
```json
{
  "api_keys": [
    "sandbox_sk_pr_removebg_5be9d4c5c624f6bb76f9d1b446e125818e75d843",
    "photoroom_api_key_du_phong_2"
  ],
  "cleanup_expiry_minutes": 30
}
```

### Chi tiết các khóa cấu hình:
- `api_keys`: Mảng danh sách các API Key của PhotoRoom. Script sẽ tự động xoay tua từ trên xuống dưới nếu key trước đó bị hết hạn mức (Quota) hoặc quá giới hạn tần suất (Rate Limit).
- `cleanup_expiry_minutes`: Thời gian lưu trữ ảnh tạm (tính bằng phút). Các ảnh kết quả cũ hơn thời gian này sẽ tự động bị xóa trong các lần chạy tiếp theo.

---

## 🚀 Cách sử dụng (Usage)

### Cú pháp chạy lệnh:
```powershell
powershell -ExecutionPolicy Bypass -File .\remove-bg.ps1 -InputPath <Đường_dẫn_ảnh_đầu_vào> [-OutputPath <Đường_dẫn_ảnh_đầu_ra>] [-ApiKey <API_Key_trực_tiếp>]
```

### Các tham số:
1. `-InputPath` *(Bắt buộc)*: Đường dẫn tới file ảnh cần tách nền (hỗ trợ các định dạng `.jpg`, `.jpeg`, `.png`, `.webp`).
2. `-OutputPath` *(Không bắt buộc)*: Đường dẫn lưu ảnh kết quả.
   - Nếu **không truyền**: Ảnh kết quả sẽ được lưu vào thư mục `temp_outputs` tại thư mục gốc của script dưới tên `<tên_ảnh_gốc>_nobg.png`.
   - Nếu **có truyền**: Lưu chính xác vào đường dẫn được yêu cầu.
3. `-ApiKey` *(Không bắt buộc)*: API Key truyền trực tiếp. Key này sẽ có độ ưu tiên cao nhất (cao hơn biến môi trường và file `config.json`).

---

## 🤖 Hướng dẫn dành riêng cho AI Agent

Nếu bạn là AI Agent đang sử dụng công cụ này, hãy lưu ý các quy tắc sau để tích hợp một cách mượt mà nhất:

1. **Quy tắc stdout dòng cuối**:
   - Khi chạy thành công, script sẽ in ra nhiều log tiến trình, nhưng **dòng cuối cùng của stdout** luôn là **đường dẫn tuyệt đối** tới file ảnh kết quả đã được tách nền.
   - Ví dụ:
     ```text
     --------------------------------------------------
     Khoi dong Cong cu Tach Nen remove-bg
     --------------------------------------------------
     ... (các log tiến trình) ...
     [OK] Tach nen thanh cong bang API Key so 1.
     C:\.antigravity-agents\tools\remove-bg\temp_outputs\test_nobg.png
     ```
   - Hãy dùng lệnh hoặc regex để capture dòng cuối cùng này và sử dụng cho các bước tiếp theo.

2. **Cơ chế tự động dọn dẹp (Auto-Cleanup)**:
   - Các file trong thư mục `temp_outputs` sẽ tự động được xóa sau `$CleanupExpiryMinutes` phút mỗi khi script chạy.
   - Bạn không cần tự tay viết logic xóa file rác, hệ thống đã tự động xử lý.

3. **Mã thoát (Exit Codes)**:
   - `0`: Thành công.
   - `1`: Thất bại (Lỗi tham số, không tìm thấy file đầu vào, lỗi mạng, hoặc tất cả API Key trong danh sách đều đã lỗi/hết hạn mức).

---

## 🧪 Kiểm thử (Testing)

Bạn có thể chạy thử kịch bản kiểm thử tích hợp tự động (Integration Test) bằng lệnh:
```powershell
powershell -ExecutionPolicy Bypass -File .\test-remove-bg.ps1
```
Lệnh này sẽ tự động gửi ảnh mẫu `test.png`, kiểm tra kết quả trả về và xác minh cơ chế dọn dẹp hoạt động đúng chuẩn.
