# Decision Log — expo-supabase-ai-template

## 2026-07-01 — Chuẩn hóa và Phân tách biến môi trường (Client & Serverless)  [initiative: refactor-env-config]
- **Bối cảnh:** Các file cấu hình môi trường `.env` và `.env.example` bị lẫn cấu hình của dự án Crawler cũ (MySQL, Redis, Proxy...). Cần làm sạch và đảm bảo an toàn bảo mật cho Client.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Tách riêng root `.env` cho Expo Client (chỉ gồm `EXPO_PUBLIC_` variables) và `supabase/.env.local` cho Edge Functions (gồm OpenAI, Cloudflare R2).
  - **Phương án B:** Gộp chung toàn bộ cấu hình sạch ở root `.env`.
  - **Phương án C:** Trả về trạng thái mặc định ban đầu chỉ có Supabase URL & Anon Key ở root.
- **Chọn Phương án A vì:** Giúp phân tách rõ ràng trách nhiệm của Client (Expo) và Serverless Backend (Edge Functions). Client chỉ tải các biến công khai cần thiết, tránh rò rỉ mã bảo mật R2/OpenAI vốn chỉ cần thực thi ở server-side.

## 2026-07-01 — Phương án Re-fetch chi tiết Video khi cào kênh Creator [initiative: feat-crawler-ts-features]
- **Bối cảnh:** Danh sách bài đăng cào từ `/aweme/v1/web/aweme/post/` của Douyin đôi khi bị thiếu link media chất lượng cao hoặc các trường chi tiết. Cần quyết định cơ chế lấy dữ liệu tối ưu.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Dùng trực tiếp dữ liệu từ danh sách bài đăng (`aweme_list`) để lưu (tiết kiệm request nhưng dễ mất dữ liệu hoặc lỗi tải media).
  - **Phương án B:** Luôn re-fetch chi tiết qua `/aweme/v1/web/aweme/detail/` cho từng video (100% đủ dữ liệu, nhưng làm tăng gấp đôi số lượng request, dễ bị chặn).
  - **Phương án C (Khuyến nghị):** Chỉ re-fetch chi tiết khi item trong danh sách thiếu thông tin media cơ bản (`video.play_addr` hoặc `images`).
- **Chọn Phương án C vì:** Cân bằng tốt nhất giữa hiệu suất cào (tránh bị Douyin rate limit do gửi quá nhiều request liên tiếp) và độ tin cậy của dữ liệu tải về.

## 2026-07-02 — Tối ưu hóa Crawler (Chặn tài nguyên, Deduplication R2, Schema Validation)  [initiative: refactor-crawler-optimization]
- **Bối cảnh:** Crawler đang tiêu thụ nhiều RAM/Proxy bandwidth do tải tài nguyên thừa, bị trùng lặp tài nguyên R2 Class A write, và thiếu tính năng phát hiện lỗi schema runtime.
- **Phương án đã cân nhắc:**
  - **Chặn tài nguyên:** Dùng Playwright `page.route` chặn image, media, font, stylesheet.
  - **Deduplication R2:** Viết hàm `checkMediaExistsInR2` sử dụng `HeadObjectCommand` check trước khi tải/upload.
  - **Validation:** Tự viết hàm kiểm tra kiểu runtime đơn giản để tránh việc cài thêm `zod` làm phình repo và rủi ro cài đặt.
- **Chọn các phương án trên vì:** Giúp crawler hoạt động hiệu quả trên VPS 2GB, tối ưu Class A/B request của Cloudflare R2 và đảm bảo fail loud khi cấu hình API thay đổi mà không làm nặng thêm dependencies.