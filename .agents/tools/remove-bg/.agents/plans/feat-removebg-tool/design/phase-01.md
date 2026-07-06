# Thiết kế chi tiết Phase 1: Khởi động & Cấu hình môi trường

Tài liệu này đặc tả thiết kế cấu trúc và logic khởi động của công cụ `remove-bg.ps1` trong Phase 1.

## 📁 Cấu trúc thư mục công cụ
```text
/remove-bg/
├── .gitignore             # Chặn commit config.json chứa API Key thật
├── config.json.example    # Tệp cấu hình mẫu tham khảo
├── config.json            # Tệp cấu hình thật (được tạo thủ công/tự động, chứa API keys)
└── remove-bg.ps1          # Tập lệnh chính
```

---

## 🛠️ Thiết kế chi tiết các thành phần

### 1. Cấu hình cục bộ (`config.json`)
Tệp chứa danh sách các API Keys để sử dụng xoay tua khi gọi API.
**Định dạng JSON**:
```json
{
  "api_keys": [
    "sandbox_sk_pr_removebg_5be9d4c5c624f6bb76f9d1b446e125818e75d843"
  ]
}
```

### 2. Cấu hình Git (`.gitignore`)
Để tránh việc vô tình commit các khóa API thật lên kho mã nguồn công cộng:
```text
# Bỏ qua tệp cấu hình thật chứa API Key
config.json
```

### 3. Logic khởi động của script PowerShell (`remove-bg.ps1`)
Script nhận các tham số đầu vào và nạp danh sách API Key theo thứ tự ưu tiên.

#### Tham số đầu vào (Parameters)
- `-InputPath` (Bắt buộc): Đường dẫn tới ảnh nguồn cần tách nền.
- `-OutputPath` (Tùy chọn): Đường dẫn lưu ảnh kết quả. Nếu không truyền, mặc định sẽ lưu cùng thư mục với ảnh gốc với hậu tố `_nobg.png`.
- `-ApiKey` (Tùy chọn): Khóa API dùng trực tiếp (ghi đè cấu hình hệ thống).

#### Thứ tự nạp API Keys
Khi chạy, script sẽ tổng hợp danh sách API Key từ 3 nguồn:
1. API Key truyền trực tiếp qua tham số `-ApiKey` (Độ ưu tiên số 1).
2. API Key đọc từ biến môi trường `$env:PHOTOROOM_API_KEY` (Độ ưu tiên số 2).
3. Đọc danh sách mảng `api_keys` từ tệp cục bộ `config.json` nếu tệp tồn tại (Độ ưu tiên số 3).

Script sẽ gom toàn bộ các key này thành một danh sách (pool) các key khả dụng để chuẩn bị cho Phase 2 (xoay tua). Nếu danh sách rỗng, script sẽ dừng và xuất thông báo lỗi hướng dẫn người dùng cấu hình chi tiết.

#### Kiểm tra tính hợp lệ của ảnh đầu vào
- Xác thực xem file ảnh tại `-InputPath` có tồn tại thực sự hay không (`Test-Path`).
- Kiểm tra phần mở rộng file (chỉ chấp nhận `.jpg`, `.jpeg`, `.png`, `.webp`).
