# Technical Design — Phase 01: Tích hợp form "Tạo nhiệm vụ" trên Dashboard với Supabase

## Mục tiêu (Người dùng được gì)
User có thể nhập danh sách các từ khóa hoặc link cào (mỗi dòng một mục) trên giao diện Dashboard, bấm nút "Tạo nhiệm vụ" và các nhiệm vụ đó sẽ được đưa vào hàng đợi thật sự trong database Supabase, đảm bảo tính nguyên tử (atomic), không bị trùng lặp khi chạy song song và hạn chế tối đa spam.

## Hành vi / Use Case
1. User mở Modal "Tạo nhiệm vụ cào mới" trên trang Tasks.
2. Chọn Nền tảng, Danh mục cào, điền mục tiêu (Targets) phân dòng, cấu hình Max Count và mức ưu tiên.
3. Khi bấm "Tạo nhiệm vụ":
   - Client tiến hành làm sạch input, lọc trùng nội bộ.
   - Nếu vượt quá 50 dòng -> Báo lỗi đỏ và disable submit.
   - Gửi payload tới Supabase RPC `create_crawler_tasks`.
   - RPC chạy loop kiểm tra xem task đã tồn tại ở trạng thái `pending` hay `running` hay chưa để chặn ghi trùng nguyên tử.
   - Trả về JSON kết quả bao gồm số lượng ghi thành công, bị bỏ qua và các thông báo lỗi chi tiết.
   - Giao diện Dashboard hiển thị thông báo Alert/Toast chi tiết và cập nhật danh sách task.

## Hướng kỹ thuật đã chọn (+ vì sao)
- **Postgres RPC Function (`create_crawler_tasks`):** Giải quyết triệt để lỗi Race Condition (TOCTOU) vì việc check và insert được chạy trong cùng một transaction nguyên tử tại DB.
- **Client-Side Deduplication & Input Cleaning:** Lọc trùng nội bộ bằng `Set` trước khi gọi API để tiết kiệm băng thông và tăng tốc độ xử lý.
- **Hard Limit ở DB:** Chặn cứng số lượng trong RPC để ngăn ngừa bypass validation qua API gọi trực tiếp.

## Các bước thực thi
1. Tạo file migration SQL `20260703090506_crawler_schema.sql` định nghĩa các bảng liên quan đến Crawler và cài đặt hàm RPC `create_crawler_tasks`.
2. Áp dụng migration vào Supabase local.
3. Thêm hàm `createTasksBulk` vào `dashboard/lib/api.ts` để gọi RPC này.
4. Sửa Modal trong `dashboard/app/(main)/dash/tasks/page.tsx` để tích hợp form và xử lý kết quả trả về từ API.
5. Kiểm chứng hoạt động bằng cách quan sát DB.

## Edge Case / Rủi ro
- **Conflict target partial unique index:** Postgres không hỗ trợ trực tiếp ON CONFLICT target cho partial unique index nếu không chỉ định rõ mệnh đề WHERE. Do đó, việc dùng RPC tự viết logic kiểm tra `EXISTS` là phương án tương thích và an toàn tuyệt đối.
