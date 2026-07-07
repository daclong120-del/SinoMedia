# 🗺️ Roadmap — feat-creative-media-cache

Initiative này thực hiện nâng cấp cơ chế phát video trên Dashboard từ việc tải trực tiếp từ Bilibili/Douyin CDN sang cơ chế **On-demand Cache** sử dụng Cloudflare R2 để đảm bảo phát video ổn định, tránh bị chặn hotlink hay hết hạn URL.

## 📍 Đang làm
- Tất cả các phase đã hoàn tất

## 📋 Danh sách các Phase

### ✅ Phase 1 — Test và xác minh tải video R2 qua CLI
- **Mục tiêu**: Bật `ENABLE_UPLOAD_R2='true'` và chạy cào test 1-3 video Bilibili qua CLI để kiểm tra kết nối Cloudflare R2, cấu hình database và kiểm tra Dashboard render URL R2 thành công.
- **Giá trị**: Đảm bảo toàn bộ cấu hình credentials R2 và logic upload hiện tại hoạt động đúng trước khi phát triển cơ chế on-demand.

### ✅ Phase 2 — Triển khai Command `cache_media` ở Crawler-Pipeline
- **Mục tiêu**: Bổ sung command `cache_media` vào Queue Worker của `crawler-pipeline`. Worker sẽ lấy task, tải video/cover từ URL gốc, upload lên R2, và cập nhật status sang `cached` với relative keys.
- **Giá trị**: Xây dựng nền tảng backend/worker xử lý cache video bất đồng bộ an toàn, không bị timeout API.

### ✅ Phase 3 — Tích hợp nút "Cache media" trên Dashboard UI
- **Mục tiêu**: Thêm nút "Cache media" trên Dashboard (CreativeDetailView). Khi click, tạo task trong bảng `crawler_tasks`, hiển thị trạng thái loading, và tự động reload phát video R2 khi cache xong.
- **Giá trị**: Hoàn thiện trải nghiệm người dùng, tối ưu dung lượng lưu trữ R2 (chỉ cache video khi có yêu cầu).
