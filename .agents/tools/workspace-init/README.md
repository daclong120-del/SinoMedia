# Công cụ khởi tạo workspace (Workspace Init)

Tạo nhanh khung **tài liệu + kế hoạch** trong **`.agents/` CỦA DỰ ÁN** (không phải `C:\.antigravity-agents` toàn cục) theo chuẩn `skills/workspace.md`: sinh `<dự-án>/.agents/docs/` (overview, decisions — dùng chung toàn dự án) và `<dự-án>/.agents/plans/` với `INDEX.md` (cổng vào toàn cục — bảng initiative, rỗng). Tên dự án lấy theo tên thư mục gốc. Con trỏ trạng thái của từng initiative nằm trong `roadmap.md` (mục `📍 Đang làm`) của initiative đó — KHÔNG có file STATE toàn cục.

> **Không** tạo sẵn `roadmap.md`/`design/`/`maps/` ở gốc nữa: từng **initiative** (`plans/feat-<slug>/`, `refactor-<slug>/`, `debug-<slug>/`) do skill tạo **theo nhu cầu** khi có việc mới — mỗi initiative giữ roadmap/design/maps (hoặc `debug-log.md`) riêng.

**An toàn:** không đè file đã có (chạy lại chỉ bỏ qua file tồn tại).

## Các file
- `init.ps1` — bản PowerShell (Windows).
- `init.sh` — bản Bash (macOS / Linux / Git Bash).

## Cách chạy (từ thư mục `.agents`)

Chạy **từ thư mục gốc dự án** (mặc định dùng thư mục hiện tại), hoặc truyền đường dẫn dự án.

### Windows (PowerShell)
```powershell
C:\.antigravity-agents\tools\workspace-init\init.ps1                       # dự án = thư mục hiện tại
C:\.antigravity-agents\tools\workspace-init\init.ps1 -ProjectRoot D:\game  # chỉ định dự án
```
*Nếu lỗi Execution Policy: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` rồi chạy lại.*

### macOS / Linux / Git Bash
```bash
bash /c/.antigravity-agents/tools/workspace-init/init.sh              # dự án = thư mục hiện tại
bash /c/.antigravity-agents/tools/workspace-init/init.sh /path/to/duan
```

## Kết quả (trong `.agents` của dự án)
```
<dự-án>/.agents/
├── docs/     overview.md · decisions.md          (dùng chung toàn dự án)
└── plans/    INDEX.md (cổng vào toàn cục — bảng initiative)
              └─ <loại>-<slug>/  ← tạo sau khi có việc: roadmap.md (kiêm con trỏ 📍)/todo.md/design/maps (hoặc debug-log.md)
```
`architecture.md` / `conventions.md` / `domain.md` không tạo sẵn — thêm khi có nội dung thật (tránh file rỗng).
