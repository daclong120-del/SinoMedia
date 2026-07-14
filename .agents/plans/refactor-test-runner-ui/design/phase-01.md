# 🎨 Design: Phase 1 — Re-styling & Reskinning Test Runner Dashboard

## 1. Mục tiêu & Định hướng Mỹ thuật
Giao diện hiện tại của Test Runner sử dụng các tông màu tối gradient mạnh, xanh/xanh lá bóng bảy nhưng không đồng bộ với ngôn ngữ thiết kế tổng thể của SinoMedia (Cloudflare-inspired: phẳng, tinh gọn, viền mảnh 1px, mật độ thông tin cực cao, canvas xám sáng phẳng ở Light Mode và tối trung tính ở Dark Mode).

Chúng ta sẽ xây dựng lại file `automation-test/runner/index.html` với:
1. **Thiết kế phẳng, tinh tế**: Sử dụng hairline border (`1px`) thay vì các bóng mờ lớn.
2. **Cơ chế Theme thông minh**:
   - Sử dụng một thẻ `<button id="theme-toggle">` chuyển đổi giữa `.light` và `.dark`.
   - Các biến CSS được định nghĩa đồng bộ với `color.json` của SinoMedia.
3. **Bố cục Dashboard Shell**:
   - Sidebar cố định ở bên trái chứa Logo SinoMedia và các thông số chạy tổng quát.
   - Header chứa Breadcrumbs và các action bổ sung.
   - Main content chia thành 3 phần: Module Grid, Stats Grid, Table Details, Console Output.

## 2. Chi tiết Giao diện & Biến CSS

```css
:root {
  /* Light Theme (Mặc định) */
  --bg-color: oklch(0.9875 0 0); /* Xám sáng phẳng */
  --fg-color: rgb(49, 49, 49); /* Chữ tối */
  --card-bg: #ffffff; /* Thẻ trắng */
  --border-color: oklch(0.145 0 0 / 0.1); /* Viền hairline mờ */
  
  --primary-blue: rgb(0, 81, 195); /* Xanh tương tác */
  --primary-blue-hover: rgb(0, 60, 150);
  --brand-orange: rgb(246, 130, 31); /* Cam thương hiệu */
  
  --muted-bg: oklch(0.97 0 0);
  --muted-fg: oklch(0.556 0 0);
  
  --success-bg: rgba(16, 185, 129, 0.1);
  --success-fg: #059669;
  
  --failure-bg: rgba(239, 68, 68, 0.1);
  --failure-fg: #dc2626;
  
  --warning-bg: rgba(245, 158, 11, 0.1);
  --warning-fg: #d97706;
}

.dark {
  /* Dark Theme */
  --bg-color: oklch(0.145 0 0); /* Nền tối phẳng */
  --fg-color: oklch(0.985 0 0); /* Chữ sáng */
  --card-bg: oklch(0.205 0 0); /* Thẻ tối */
  --border-color: oklch(1 0 0 / 10%); /* Viền hairline sáng */
  
  --primary-blue: oklch(0.488 0.243 264.376); /* Xanh sáng */
  --primary-blue-hover: oklch(0.4 0.2 264.376);
  
  --muted-bg: oklch(0.269 0 0);
  --muted-fg: oklch(0.708 0 0);
  
  --success-bg: rgba(16, 185, 129, 0.2);
  --success-fg: #34d399;
  
  --failure-bg: rgba(239, 68, 68, 0.2);
  --failure-fg: #f87171;
  
  --warning-bg: rgba(245, 158, 11, 0.2);
  --warning-fg: #fbbf24;
}
```

## 3. Cải tiến Trải nghiệm người dùng (UX)
1. **Console Auto-scroll**: Thêm checkbox hoặc button toggle giúp tạm dừng tự động cuộn khi người dùng muốn đọc log cũ.
2. **Download Console Logs**: Thêm nút "Tải Log (.txt)" để lưu log đang chạy.
3. **Mật độ thông tin cao**: Rút gọn padding bảng dữ liệu, chỉnh size text xuống `12px` (text-xs) và `13px` cho các phần hiển thị dữ liệu chính.
4. **Theme persistence**: Lưu trạng thái theme vào `localStorage`.
