# Thiết kế cấu trúc – Tinh giản nhóm Cài đặt & Quản lý (SinoMedia)

## 1. Tổng quan
- **Mục đích**: Tinh giản hệ thống menu "Quản lý tài khoản" cực kỳ rườm rà hiện tại bằng cách loại bỏ các mục giả lập không cần thiết, gom cụm các cài đặt liên quan (Thành viên, Bảo mật, Cấu hình) vào các trang hợp lý để cải thiện trải nghiệm quản trị.
- **Đối tượng người dùng**: Quản trị viên hệ thống (Admin).
- **Vai trò/phân quyền**: Chỉ Admin mới có quyền truy cập và thao tác trên nhóm chức năng này.

---

## 2. Sitemap rút gọn đề xuất
| Route | Tên trang | Ưu tiên | Mô tả ngắn |
|---|---|---|---|
| `/dash/audit-logs` | Nhật ký hoạt động | P1 | Theo dõi lịch sử thao tác của các Admin trên hệ thống |
| `/dash/settings` | Cấu hình hệ thống | P0 | Cài đặt chung về Crawler, giải CAPTCHA và Webhook thông báo |
| `/dash/settings/permissions` | Phân quyền Viewer | P1 | Bật/tắt các quyền xem của vai trò Viewer |
| `/dash/manage-account/members` | Thành viên & Bảo mật | P0 | Quản lý người dùng, nhóm quyền, chính sách bảo mật (2FA, SSO, Token) |
| `/dash/manage-account/billing` | Gói cước & Thanh toán | P2 | Quản lý thông tin thanh toán và nâng cấp tài khoản (giả lập) |

*Ghi chú: Đề xuất ẩn/loại bỏ hoàn toàn 9 menu con giả lập cũ ra khỏi Sidebar bao gồm: OAuth clients, Cấu hình chung, Nội dung bị chặn, Báo cáo vi phạm, Báo cáo phát thải, Cấu hình, Tài nguyên gắn thẻ, API Tokens, Nhật ký hoạt động (do đã có trang Audit Logs riêng).*

---

## 3. Chi tiết từng trang

### A. Cấu hình hệ thống (`/dash/settings`)
- **Mục đích**: Cấu hình các tham số vận hành cho crawler engine, tích hợp dịch vụ giải CAPTCHA và cài đặt webhook gửi tin.
- **Khối nội dung chính**:
  1. **Anti-bot & CAPTCHA**: Quản lý API Key 2Captcha, hiển thị số dư, chọn chiến lược giải lỗi.
  2. **Task Queue & Concurrency**: Định cấu hình số luồng chạy song song tối đa, số lần thử lại mặc định, độ sâu cào bình luận và độ ưu tiên mặc định.
  3. **Thông báo & Webhook**: Nhập URL Webhook mặc định và bật/tắt gửi thông báo khi task thành công/thất bại/tài khoản bị ban.
- **Dữ liệu hiển thị**: Bảng cấu hình hệ thống (`system_settings` trong cơ sở dữ liệu).
- **Hành động người dùng**:
  - Nhập/Cập nhật API Key & Webhook URL.
  - Thay đổi các dropdown giá trị.
  - Nhấp nút "🔄 Cập nhật số dư" để kiểm tra tài khoản 2Captcha thời gian thực.
  - Lưu cài đặt / Hủy bỏ thay đổi.

### B. Thành viên & Bảo mật (`/dash/manage-account/members`)
- **Mục đích**: Quản lý truy cập của đội ngũ vận hành và thiết lập các rào cản bảo mật.
- **Khối nội dung chính** (chia làm 3 tab/phân vùng):
  1. **Thành viên**: Danh sách tất cả thành viên trong tổ chức. Cho phép lọc, tìm kiếm theo email và vai trò.
  2. **Nhóm thành viên**: Tạo và quản lý các nhóm quyền (như Developers, Security Admins) để phân quyền hàng loạt.
  3. **Bảo mật & Tokens**:
     - Bật/tắt bắt buộc xác thực 2 yếu tố (2FA).
     - Cấu hình SAML/SSO kết nối các nhà cung cấp Okta/Google.
     - Thiết lập giới hạn thời gian phiên đăng nhập.
     - *Tích hợp thêm*: Tạo/Quản lý API Tokens phục vụ tự động hóa (gom từ trang Tokens riêng cũ về đây).
- **Dữ liệu hiển thị**: Bảng `crawler_accounts`, `viewer_permissions` và các cài đặt bảo mật.
- **Hành động người dùng**:
  - Mời thành viên mới (Popup yêu cầu Email, Vai trò).
  - Thu hồi quyền truy cập (Revoke member).
  - Tạo nhóm thành viên mới.
  - Bật/tắt 2FA, SAML SSO, đổi thời gian hết hạn session.
  - Tạo và thu hồi API Tokens.

### C. Gói cước & Thanh toán (`/dash/manage-account/billing`)
- **Mục đích**: Hiển thị gói cước đang sử dụng và quản lý hóa đơn.
- **Khối nội dung chính**:
  1. **Gói dịch vụ hiện tại**: Thông tin gói (Free/Pro), giá tiền, mô tả giới hạn. Nút bấm nâng cấp gói giả lập.
  2. **Phương thức thanh toán**: Thẻ tín dụng đang liên kết (hiển thị 4 số cuối thẻ).
  3. **Lịch sử hóa đơn**: Danh sách các hóa đơn đã thanh toán thành công.
- **Hành động người dùng**:
  - Nhấp nâng cấp lên gói Pro (giả lập).
  - Nhấp đổi thẻ thanh toán.
  - Xem danh sách hóa đơn cũ.

### D. Phân quyền Viewer (`/dash/settings/permissions`)
- **Mục đích**: Phân quyền trực quan cho tài khoản cấp Viewer trên toàn bộ hệ thống.
- **Khối nội dung chính**: Bảng ma trận phân quyền (Permission Matrix) với các dòng là các tính năng hệ thống, cột là trạng thái cho phép của Viewer.
- **Hành động người dùng**: Bật/tắt toggle từng quyền của Viewer.

---

## 4. Cấu trúc điều hướng Sidebar (Mới)
```
📊 Dashboard
   └─ Tổng quan (/dash/home)

🤖 Crawler Controller
   ├─ Nhiệm vụ cào (/dash/tasks)
   ├─ Tài khoản cào (/dash/accounts)
   └─ Proxy Pool (/dash/proxies)

🗄️ Data Explorer
   ├─ Tác giả (/dash/data/authors)
   ├─ Bài viết & Video (/dash/data/posts)
   └─ Quản lý dữ liệu (/dash/data/management)

🔐 Quản trị
   ├─ Nhật ký hoạt động (/dash/audit-logs)
   ├─ Cài đặt hệ thống (/dash/settings)
   ├─ Phân quyền (/dash/settings/permissions)
   ├─ Thành viên & Bảo mật (/dash/manage-account/members)
   └─ Gói cước & Thanh toán (/dash/manage-account/billing)
```
*Nhận xét: Menu được chia tách rành mạch. Nhóm "Quản lý tài khoản" dài 12 dòng được gom lại thành 2 trang chính là "Thành viên & Bảo mật" và "Gói cước & Thanh toán", giúp Sidebar giảm tải đáng kể.*

---

## 5. Bàn giao cho bước tiếp theo
Sau khi bạn đồng ý cấu trúc sitemap tinh giản ở trên, chúng ta sẽ chuyển sang **Bước 2/3**: Cập nhật file cấu hình JSON của trang tại `.agents/docs/pages-design/navigation.json` và code cấu trúc tại `Sidebar.tsx`.
