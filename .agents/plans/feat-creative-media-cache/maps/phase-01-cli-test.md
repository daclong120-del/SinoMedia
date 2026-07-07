# Cây phân tích "à, nghĩa là..." — Phase 1: CLI Test R2 Cache

* Chạy cào thử 1-3 video Bilibili bằng CLI
  * à, nghĩa là cần chạy lệnh `npx.cmd tsx src/index.ts` từ thư mục `crawler-pipeline`
  * à, nghĩa là cần thiết lập các biến môi trường (env vars) trên terminal:
    * `ENABLE_UPLOAD_R2='true'` -> Kích hoạt upload Cloudflare R2
    * `ENABLE_GET_MEIDAS='true'` -> Bắt buộc để Bilibili crawler tải video
    * `ENABLE_GET_COMMENTS='false'` -> Tắt tải comment để tăng tốc
    * `ENABLE_GET_SUB_COMMENTS='false'` -> Tắt tải sub comment để tăng tốc
  * à, nghĩa là cần sử dụng command:
    * `npx.cmd tsx src/index.ts search "AI tools" 3 -p bilibili` (hoặc từ khóa bất kỳ giới hạn 3 posts)

* Kiểm tra dữ liệu được ghi vào database
  * à, nghĩa là cần kiểm tra record vừa cào được trong bảng `crawled_posts` của Supabase
  * à, nghĩa là cần chạy script:
    * `npx.cmd tsx scratch/view-posts.ts`
  * à, nghĩa là cần xác thực các giá trị lưu trữ:
    * `media_source` phải bằng `'r2'`
    * `media_status` phải bằng `'cached'`
    * `media_urls` phải chứa đường dẫn tương đối, ví dụ `["bilibili/BVxxx/video.mp4"]`
    * `cover_url` phải chứa đường dẫn tương đối, ví dụ `"bilibili/BVxxx/cover.jpg"`

* Kiểm tra Dashboard phát video thành công từ R2
  * à, nghĩa là Dashboard cần phân giải (resolve) relative path thành full URL của R2 public endpoint
  * à, nghĩa là Dashboard cần sử dụng biến môi trường `NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-61ef6f7c6215df3616424def03fa7070.r2.dev` từ `.env.local`
  * à, nghĩa là khi mở `CreativeDetailView` của video vừa cào, thẻ `<video>` phải trỏ nguồn đến `https://pub-61ef6f7c6215df3616424def03fa7070.r2.dev/bilibili/BVxxx/video.mp4`
  * à, nghĩa là video phải phát bình thường mà không bị lỗi 403 Forbidden hay Hotlink block từ CDN Bilibili
