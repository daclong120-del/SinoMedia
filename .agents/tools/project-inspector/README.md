# Công cụ khảo sát dự án (Project Inspector)

Quét và hiển thị **cấu trúc thư mục** của một dự án bất kỳ: vẽ cây thư mục, tự
bỏ qua các thư mục nhiễu (`node_modules`, `.git`, `dist`, ...), và thống kê số
file theo đuôi. Hữu ích để cung cấp ngữ cảnh nhanh cho AI Agent hoặc lập trình
viên mới — **xem dự án thật trước khi debug/thiết kế, thay vì đoán**.

Generic: chạy được với mọi loại dự án (web, game, backend...), không gắn cứng
cấu trúc nào.

## Các file
- `inspect.ps1` — bản PowerShell (Windows).
- `inspect.sh` — bản Bash (macOS / Linux / Git Bash trên Windows).

## Cách chạy

### Windows (PowerShell)
```powershell
# Quét thư mục hiện tại
.\tools\project-inspector\inspect.ps1

# Quét một thư mục cụ thể, giới hạn độ sâu
.\tools\project-inspector\inspect.ps1 -Path .\src -Depth 3
```
*Nếu gặp lỗi Execution Policy: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` rồi chạy lại.*

### macOS / Linux / Git Bash
```bash
chmod +x ./tools/project-inspector/inspect.sh
./tools/project-inspector/inspect.sh                 # thư mục hiện tại
./tools/project-inspector/inspect.sh ./src --depth 3
```

## Tùy chọn

| PowerShell | Bash | Ý nghĩa |
|---|---|---|
| `-Path <p>` | `<p>` (đối số đầu) | Thư mục gốc cần quét (mặc định: thư mục hiện tại) |
| `-Depth <n>` | `--depth <n>` | Độ sâu tối đa của cây (mặc định 4) |
| `-MaxEntries <n>` | `--max-entries <n>` | Số mục tối đa hiển thị trong mỗi thư mục (mặc định 300) |
| `-All` | `--all` | KHÔNG bỏ qua thư mục nhiễu (xem hết) |
| — | `--ignore A B` | Bỏ qua thêm thư mục theo tên |
