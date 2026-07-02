# Walkthrough: Tối ưu hóa Crawler (Mục 3, 6, 7)

## Các thay đổi đã thực hiện

### 1. Mục 3: Tiết kiệm RAM và băng thông Proxy bằng cách chặn tài nguyên thừa
*   **File sửa đổi:** [client.ts](file:///d:/Python/expo-supabase-ai-template/crawler-pipeline/src/crawl/client.ts)
*   **Mô tả:** Thiết lập interceptor bằng `browserPage.route` ngay sau khi tạo page mới từ `CloakBrowser`. Interceptor thực hiện chặn (`abort()`) các tài nguyên có định dạng: `image`, `media`, `font`, và `stylesheet`. Các script, tài liệu (document), và request fetch/xhr vẫn được cho phép tải để đảm bảo tính năng chống bot hoạt động bình thường.

### 2. Mục 6: Tránh tải trùng lặp tài nguyên R2 (Media Deduplication)
*   **File sửa đổi 1:** [r2_uploader.ts](file:///d:/Python/expo-supabase-ai-template/crawler-pipeline/src/store/r2_uploader.ts)
    *   **Mô tả:** Xuất thêm hàm `checkMediaExistsInR2` sử dụng `HeadObjectCommand` từ `@aws-sdk/client-s3`. Nếu file đã tồn tại trên Cloudflare R2, hàm trả về `true`, ngược lại trả về `false`.
*   **File sửa đổi 2:** [douyin.ts](file:///d:/Python/expo-supabase-ai-template/crawler-pipeline/src/crawl/douyin.ts)
    *   **Mô tả:** Nhúng hàm `checkMediaExistsInR2` vào tiến trình lưu dữ liệu `persistAweme` và tải thông tin creator `crawlCreator`. Nếu avatar, video, ảnh bìa (cover) hoặc các ảnh chi tiết (`images`) đã tồn tại trên Cloudflare R2, hệ thống sẽ bỏ qua việc tải về và upload lên R2 mà trực tiếp sử dụng lại key của file cũ.

### 3. Mục 7: Thêm lớp Validate dữ liệu (Zod-like Validation)
*   **File sửa đổi:** [douyin.ts](file:///d:/Python/expo-supabase-ai-template/crawler-pipeline/src/crawl/douyin.ts)
    *   **Mô tả:** Viết các hàm kiểm tra kiểu dữ liệu runtime tinh gọn (`validateAwemeDetail` và `validateUserProfile`). Cơ chế này giúp kiểm tra sự tồn tại và tính hợp lệ của `aweme_id`, cấu trúc các object con `video`, `statistics`, `user` nhằm phát hiện sớm các sự thay đổi API của Douyin mà không làm tăng dung lượng dependency của dự án.

## Trạng thái kiểm thử
*   **Lưu ý:** Tuân thủ nghiêm ngặt rule của dự án, tôi chỉ thực hiện viết code và cập nhật tài liệu cấu trúc. Việc tạo file test hoặc chạy test/build chưa được thực hiện do chưa có yêu cầu cụ thể từ người dùng.
