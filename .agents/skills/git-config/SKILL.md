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

Xảy ra khi commit code khi đang ở trạng thái Detached HEAD (không gắn vào nhánh nào, thường do checkout bằng mã hash của commit), sau đó checkout sang nhánh khác làm các commit đó bị ẩn đi.

### Các bước khôi phục:

1. **Tìm mã hash commit bị ẩn:**
   Chạy lệnh xem lịch sử hành động để tìm commit mới nhất trước khi checkout:
   ```bash
   git reflog -n 20
   ```
   *(Tìm dòng tương tự: `31ef2b5 HEAD@{2}: commit: feat...`)*

2. **Cách khôi phục về nhánh chính (`main`) và đẩy lên Remote:**
   - **Bước 2.1: Chuyển về nhánh `main`:**
     ```bash
     git checkout main
     ```
   - **Bước 2.2: Gộp commit bị ẩn vào `main`:**
     *(Sử dụng mã hash tìm được ở Bước 1 kèm cờ `-m` để tạo Merge Commit)*
     ```bash
     git merge <ma-commit-hash> -m "merge: gộp commit khôi phục vào main"
     ```
   - **Bước 2.3: Đẩy lên Remote Github:**
     ```bash
     git push origin main
     ```

3. **Cách khôi phục về một nhánh phụ khác:**
   - **Tạo nhánh mới từ commit đó:**
     ```bash
     git branch <ten-nhanh-moi> <ma-commit-hash>
     ```
   - **Hoặc cập nhật nhánh phụ có sẵn tới commit đó:**
     ```bash
     git branch -f <ten-nhanh-co-san> <ma-commit-hash>
     ```

---

## 3. Cách phòng ngừa Detached HEAD

- **Quy tắc:** Luôn checkout bằng **tên nhánh** (ví dụ: `git checkout main`), không checkout bằng **mã commit** (ví dụ: `git checkout fffd195`).
- Nếu muốn nháp thử từ một commit cũ, hãy tạo nhánh ngay từ đầu bằng lệnh:
  ```bash
  git checkout -b <ten-nhanh-moi>
  ```
