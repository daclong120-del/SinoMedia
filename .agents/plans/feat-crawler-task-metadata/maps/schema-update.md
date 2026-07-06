# 🗺️ MAP — Cấu trúc dữ liệu & Schema Update

Bản đồ quyết định chi tiết cho việc nâng cấp Schema Database.

## Quyết định Thiết kế Cột

### 1. `crawler_tasks.metadata`
- **Loại dữ liệu:** `jsonb`
  - *À, nghĩa là:* Cho phép mở rộng động mọi cấu hình nhiệm vụ cào (tags, language, headless, crawl_comments, v.v.) mà không cần sửa cấu trúc bảng liên tục.
- **Ràng buộc Nullability:** `NOT NULL`
  - *À, nghĩa là:* Không bao giờ trả về giá trị null trong database, tránh lỗi tham chiếu undefined trên giao diện.
- **Mặc định (Default):** `'{}'::jsonb`
  - *À, nghĩa là:* Luôn luôn khởi tạo một đối tượng JSON rỗng nếu không có dữ liệu đầu vào.

### 2. `crawled_posts.tags`
- **Loại dữ liệu:** `text[]` (Mảng văn bản)
  - *À, nghĩa là:* Thích hợp cho việc lọc nhãn (tags) trên Creative Hub sử dụng các toán tử mảng của PostgreSQL (như `ANY`, `@>`), đem lại tốc độ truy vấn tối ưu so với lưu JSONB.
- **Ràng buộc Nullability:** `NOT NULL`
  - *À, nghĩa là:* Luôn có giá trị mảng để tránh lỗi map/filter trên React.
- **Mặc định (Default):** `'{}'::text[]`
  - *À, nghĩa là:* Một mảng rỗng mặc định.

### 3. `crawled_posts.language`
- **Loại dữ liệu:** `text` (Ví dụ: `zh`, `vi`, `en`)
  - *À, nghĩa là:* Hỗ trợ chuẩn ISO 639-1 hoặc tên ngôn ngữ tùy chỉnh linh hoạt.
- **Ràng buộc Nullability:** `NULL` (Có thể Null)
  - *À, nghĩa là:* Một số bài viết có thể không xác định được ngôn ngữ cụ thể từ crawler.

---

## Cập nhật RPC `create_crawler_tasks`
- **Cách trích xuất:** Sử dụng toán tử `v_task->'metadata'` của PL/pgSQL để lấy nguyên khối JSONB từ request gửi lên.
- **Tương thích ngược:** Dùng `coalesce(v_task->'metadata', '{}'::jsonb)` đề phòng client cũ không truyền `metadata`.
