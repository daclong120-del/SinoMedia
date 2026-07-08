# Role Management Strategy

Cơ chế quản lý vai trò và phân quyền trong SinoMedia.

## 1. Cơ chế Vai trò (Roles)
- **Hệ thống phân quyền:** Sử dụng bảng `team_roles` với cột `is_locked`.
- **Vai trò mặc định:** `admin` và `user` đóng vai trò sống còn cho luồng auth/đăng ký. 
- **Quy tắc:** Cho phép gỡ khóa (`is_locked = false`) để sửa quyền nhưng **bắt buộc chặn xóa (delete)** hai vai trò mặc định này cả ở Backend và UI.

## 2. Bảo vệ thao tác Xóa (Delete Protection)
- **Backend:** Hàm `deleteRole` (trong `member.service.ts`) ném lỗi chặn xóa nếu `roleId` là `admin` hoặc `user`.
- **UI:** Component `roles-panel.tsx` ẩn nút xóa đối với hai vai trò mặc định, kể cả khi chúng được mở khóa.

## 3. Quản lý Database Local
- **Vấn đề:** Chạy `supabase db reset` sẽ xóa sạch dữ liệu cào thử nghiệm (crawler accounts, tasks...) do volume bị khởi tạo lại từ seed trống.
- **Giải pháp:** Khi thay đổi schema/data nhỏ ở local, chạy trực tiếp SQL `UPDATE` hoặc dùng `supabase db push` thay vì reset toàn bộ DB.
