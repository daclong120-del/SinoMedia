---
name: git-merge-config
description: Skill to configure merge settings and recover lost commits from detached HEAD in Git.
---

# Git Merge & Recovery Guide

Tài liệu hướng dẫn cấu hình gộp nhánh trực quan và khôi phục các commit bị ẩn do trạng thái **Detached HEAD** trong Git.

---

## 1. Cấu hình gộp nhánh trực quan (Merge Config)

Tránh cơ chế **Fast-Forward Merge** mặc định của Git làm gộp toàn bộ lịch sử thành một đường thẳng và làm biến mất dấu vết của nhánh phụ.

### Lệnh thiết lập:
- **Cấu hình cục bộ (chỉ dự án này):**
  ```bash
  git config merge.ff false
  ```
- **Cấu hình toàn cục (cho mọi dự án trên máy):**
  ```bash
  git config --global merge.ff false
  ```

---

## 2. Khôi phục Commit bị ẩn (Detached HEAD Recovery)

Xảy ra khi commit code khi đang ở trạng thái Detached HEAD (không gắn vào nhánh nào, thường do checkout bằng mã hash của commit hoặc do công cụ GUI tự động checkout), sau đó checkout sang nhánh khác làm các commit đó bị ẩn đi.

### Cách 1: Sử dụng nhánh tạm thời (Khuyên dùng - An toàn & Trực quan nhất)
Nếu bạn nhận ra mình vừa commit ở trạng thái Detached HEAD:
1. **Tạo ngay một nhánh tạm tại commit đó** (trước khi checkout đi nơi khác):
   ```bash
   git branch temp-recovery
   ```
2. **Chuyển về nhánh chính `main`:**
   ```bash
   git checkout main
   ```
3. **Gộp nhánh tạm vào `main`:**
   ```bash
   git merge temp-recovery
   ```
4. **Xóa nhánh tạm sau khi đã gộp thành công:**
   ```bash
   git branch -d temp-recovery
   ```

### Cách 2: Khôi phục bằng mã hash commit (Khi lỡ checkout đi chỗ khác làm mất commit)
1. **Tìm lại mã hash commit bị ẩn:**
   Chạy lệnh xem lịch sử hành động để tìm commit mới nhất trước khi checkout:
   ```bash
   git reflog -n 20
   ```
   *(Tìm dòng có nội dung tương tự: `40bdf4c HEAD@{1}: commit: chore: ngung theo doi thu muc artifact`)*

2. **Khôi phục về nhánh chính (`main`):**
   - **Chuyển về nhánh `main`:**
     ```bash
     git checkout main
     ```
   - **Gộp commit bị ẩn vào `main`:**
     ```bash
     git merge <ma-commit-hash>
     ```
     *(Ví dụ: `git merge 40bdf4c`)*
   - **Đẩy lên Remote GitHub:**
     ```bash
     git push origin main
     ```

---

## 3. Cách phòng ngừa Detached HEAD

- **Quy tắc vàng:** Luôn luôn kiểm tra trạng thái nhánh trước khi sửa code bằng lệnh `git status`. Hãy chắc chắn bạn đang ở `On branch main` (hoặc nhánh làm việc mong muốn).
- Luôn checkout bằng **tên nhánh** (ví dụ: `git checkout main`), **không** checkout bằng **mã commit** (ví dụ: `git checkout fffd195`).
- Nếu muốn thử nghiệm hoặc nháp từ một commit cũ, hãy tạo nhánh ngay từ đầu:
  ```bash
  git checkout -b <ten-nhanh-moi> <ma-commit-hash>
  ```

---

## 4. Quy trình Tích hợp Nhánh (Merge Workflow) & Đồng bộ Remote (Push)

Khi gộp các nhánh tính năng (ví dụ: `security`) vào `main`, cần tuân thủ quy trình sau để tránh mất mát lịch sử và đảm bảo an toàn code:

### Bước 1: Kiểm thử E2E trước khi gộp (Pre-merge Verification)
Chạy thử nghiệm trên nhánh tính năng để đảm bảo các tính năng/bảo mật hoạt động đúng:
```bash
npx tsx tests/e2e_log_redaction.ts
```

### Bước 2: Tích hợp nhánh (Local Merge)
Chuyển về nhánh `main` và thực hiện merge nhánh phụ. Do đã cấu hình `merge.ff false`, Git sẽ luôn tạo một Merge Commit trực quan để giữ lại lịch sử phân nhánh:
```bash
git checkout main
git merge -m "merge: gop nhanh <ten-nhanh> vao main" <ten-nhanh>
```

### Bước 3: Đồng bộ với Remote Server (Push to Origin)
Sau khi merge ở local, nhãn `main` của local sẽ đi trước `origin/main` (nhánh trên GitHub/GitLab). Phải đẩy các thay đổi này lên server để đồng bộ:
```bash
git push origin main
```

> [!IMPORTANT]
> **Quy tắc làm việc của AI Agent:**
> - Bắt buộc tuân thủ quy tắc `khi dùng git cấm tự merge`. AI agent không bao giờ tự động chạy ngầm lệnh `git merge` hay `git pull` mà không đề xuất rõ ràng để người dùng xác nhận và nhấn nút chạy (Approve) trên terminal.
