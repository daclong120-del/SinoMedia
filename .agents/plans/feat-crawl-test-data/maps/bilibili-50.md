# Bản đồ Quyết định (Map) — Cào 50 Bilibili

Bản đồ cây quyết định "à, nghĩa là..." cho việc cào 50 Bilibili:

- **Chạy lệnh CLI**
  - à, nghĩa là chạy `tsx src/index.ts search "AI" 50 -p bilibili`
  - à, nghĩa là cần verify lại số lượng (50 bài)
- **Xử lý Cache R2 cho 50 bài viết**
  - à, nghĩa là mỗi bài viết sẽ cố gắng tải cover và video về rồi đẩy lên R2 cloud
  - à, nghĩa là nếu R2 bị block ở một số bài, crawler vẫn tiếp tục xử lý các bài khác (không bị treo)
- **Tác giả (crawled_authors) và Bài viết (crawled_posts)**
  - à, nghĩa là mỗi bài viết cần link đúng tới `author_id` trong `crawled_authors`
  - à, nghĩa là crawler phải lưu thông tin tác giả trước khi lưu bài viết
- **Ghi nhận dữ liệu**
  - à, nghĩa là sau khi chạy xong, bảng `crawled_posts` phải có thêm 50 bản ghi từ Bilibili.
