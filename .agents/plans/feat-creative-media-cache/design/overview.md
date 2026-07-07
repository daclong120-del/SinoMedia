# Thiết kế Kỹ thuật — On-demand Media Cache

## 1. Kiến trúc luồng hoạt động (Queue-based Cache)

```text
[Dashboard UI] -> [Bấm nút "Cache media"]
       |
       v (Insert task)
[Supabase: crawler_tasks] (status: pending, command: cache_media, target: post_id)
       ^
       | (Claim & Execute)
[crawler-pipeline Queue Worker] (chạy local/VPS, có proxy)
       |
       +---> 1. Lấy post từ crawled_posts
       +---> 2. Tải video/cover gốc về Buffer (downloadMedia)
       +---> 3. Upload lên Cloudflare R2 (uploadMediaToR2)
       +---> 4. Cập nhật crawled_posts:
                - media_source = 'r2'
                - media_status = 'cached'
                - media_urls = ['bilibili/BVxxx/video.mp4']
                - cover_url = 'bilibili/BVxxx/cover.jpg'
       |
       v (Update task)
[Supabase: crawler_tasks] (status: completed)
       |
       v (Realtime / Poll)
[Dashboard UI] -> (Nhận diện trạng thái 'cached' -> phát từ R2)
```

## 2. Các thay đổi chính cần thực hiện

### Crawler-Pipeline (`crawler-pipeline/`)
* **`src/queue_worker.ts`**:
  * Thêm xử lý command `"cache_media"`.
  * Logic command `"cache_media"`:
    1. Truy vấn bài viết từ bảng `crawled_posts` bằng `target` (chứa ID bài viết).
    2. Xác định platform (`bilibili`, `douyin`, etc) và trích xuất URL video gốc từ `original_media_urls`.
    3. Thực hiện tải media bằng `downloadMedia`.
    4. Upload lên R2 thông qua `uploadMediaToR2` với key dạng `${platform}/${platformId}/video.mp4` và `${platform}/${platformId}/cover.jpg`.
    5. Cập nhật bài viết trong bảng `crawled_posts` với relative keys R2, set `media_source = 'r2'`, `media_status = 'cached'`.

### Dashboard (`dashboard/`)
* **`components/dashboard/CreativeDetailView.tsx`**:
  * Đọc trạng thái `media_source` và `media_status` từ creative.
  * Nếu `media_status === 'original_only'` hoặc `media_status === 'failed'`, hiển thị nút **"Cache media lên R2"** kèm cảnh báo video phát từ gốc không ổn định.
  * Khi click nút "Cache media", thực hiện chèn một task mới vào bảng `crawler_tasks` qua Supabase Client:
    ```json
    {
      "platform": creative.platform,
      "command": "cache_media",
      "target": creative.id,
      "status": "pending",
      "metadata": {
        "upload_r2": true
      }
    }
    ```
  * Hiển thị loading và theo dõi trạng thái task (hoặc bài viết) để reload player khi quá trình cache hoàn tất.
