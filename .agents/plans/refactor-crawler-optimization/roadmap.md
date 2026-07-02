# Roadmap: Tối ưu hóa Crawler

## Các Phase

- [x] **Phase 1: Thực hiện tối ưu hóa và chống rò rỉ tài nguyên**
  - Fix mục 3: Chặn tài nguyên thừa (image, media, font, stylesheet) qua page.route.
  - Fix mục 6: Tránh tải trùng lặp trên R2 bằng cách kiểm tra sự tồn tại trước khi upload.
  - Fix mục 7: Thêm validate dữ liệu đầu vào.

- [x] **Phase 2: Tối ưu hóa TLS/Client Hints, Chống rò rỉ RAM, Loại bỏ Sleep cứng và Tối ưu DB**
  - Fix mục 1: Đồng bộ TLS Fingerprint & Bổ sung Client Hints vào requests.
  - Fix mục 2: Ngăn ngừa rò rỉ RAM (Browser Context Recycle).
  - Fix mục 4: Loại bỏ Hardcoded Sleep khi chờ DOM.
  - Fix mục 5: Tối ưu hiệu năng ghi DB (Bulk-Upsert).
