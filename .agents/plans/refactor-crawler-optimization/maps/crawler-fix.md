# Cây "À, nghĩa là..." cho việc tối ưu hóa Crawler

## 1. Chèn code chặn tài nguyên vào `client.ts`
- **[Chặn resource qua route]**
  - à, nghĩa là chặn các loại: `image`, `media`, `font`, `stylesheet`
  - à, nghĩa là giữ lại: `script`, `xhr`, `fetch`, `document`
  - à, nghĩa là kiểm tra kỹ kiểu dữ liệu của `resourceType()`: là chuỗi lowercase
  - à, nghĩa là kiểm tra xem `cloakbrowser` có gây lỗi gì khi thiết lập route không? Đã xác minh `cloakbrowser` kế thừa API chuẩn của Playwright `BrowserContext`, nên hoạt động bình thường.

## 2. Viết `checkMediaExistsInR2` vào `r2_uploader.ts`
- **[Đọc trạng thái file từ R2]**
  - à, nghĩa là sử dụng `HeadObjectCommand` thay vì `GetObjectCommand` hay tải về để kiểm tra, giúp tối ưu tối đa dung lượng request
  - à, nghĩa là xử lý lỗi ném ra của `HeadObjectCommand`:
    - Nếu là lỗi `NotFound` hoặc mã lỗi `404` -> Trả về `false` (file chưa tồn tại).
    - Nếu là lỗi kết nối/auth -> Cứ trả về `false` để hệ thống tải lại an toàn (fallback).
  - à, nghĩa là đảm bảo key được sinh ra đồng nhất: `${platform}/${platformId}/${filename}`.

## 3. Viết hàm validate vào `douyin.ts`
- **[Validation dữ liệu Douyin API]**
  - à, nghĩa là kiểm tra runtime của `aweme_detail` và `user_profile`
  - à, nghĩa là tránh lỗi `TypeError: Cannot read properties of null` bằng cách check:
    - `detail !== null && typeof detail === "object"`
  - à, nghĩa là validate các trường bắt buộc nhất quyết định tính đúng đắn khi ghi DB:
    - `detail.aweme_id` phải là string và không rỗng.
    - `res.user.sec_uid` phải là string và không rỗng.
  - à, nghĩa là nếu sai schema thì ném lỗi ra ngoài (`throw new Error(...)`) ngay lập tức để ngắt tiến trình cào và thông báo (fail loud).
