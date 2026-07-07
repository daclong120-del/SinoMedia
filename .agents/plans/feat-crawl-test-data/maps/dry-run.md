# Bản đồ Quyết định (Map) — Dry-run Testing

Bản đồ cây quyết định "à, nghĩa là..." cho các thành phần kiểm thử trong Phase 1:

## 1. Dry-run Bilibili (`search "AI" 1`)
- **Chạy lệnh CLI**
  - à, nghĩa là cần gọi `tsx src/index.ts search "AI" 1 -p bilibili`
  - à, nghĩa là cần `crawler-pipeline/.env.local` trỏ đúng Supabase local (đã trỏ đúng port 54321)
  - à, nghĩa là cần kiểm tra kết nối với DB trước (chạy npx supabase status hoặc truy cập studio thành công - ĐÃ Xong)
- **Tải media & cache lên Cloudflare R2**
  - à, nghĩa là cần upload R2 hoạt động (credentials trong `.env.local` là cloud R2 thật)
  - à, nghĩa là nếu R2 lỗi hoặc block do IP, crawler phải bắt được lỗi và tiếp tục lưu bài viết với link media gốc (không bị sập giữa chừng) -> ĐÃ xác minh code có try-catch bọc quanh upload R2.
- **Ghi nhận dữ liệu**
  - à, nghĩa là dữ liệu cào được phải được chuẩn hóa và ghi thành công vào bảng `crawled_posts` và `crawled_authors`
  - à, nghĩa là sau khi cào, query SQL phải đếm được `count` tăng từ `0` lên `1` hoặc nhiều hơn.

---

## 2. Dry-run Douyin (`search "marketing" 1`)
- **Yêu cầu Xác thực (Cookie/Session)**
  - à, nghĩa là cần cookies hoạt động để gọi API
  - à, nghĩa là nếu dùng `dummy_cookie_content` (dữ liệu seed), API Douyin có thể trả về lỗi xác thực/hết hạn
  - à, nghĩa là hệ thống phải bắt được lỗi này, in ra thông báo lỗi chi tiết, không làm chương trình bị treo vô hạn
  - à, nghĩa là chúng ta có thể kiểm tra xem hệ thống ghi nhận lỗi vào log như thế nào.
- **Proxy và Network**
  - à, nghĩa là cần proxy hoạt động (nếu có cấu hình proxy).
