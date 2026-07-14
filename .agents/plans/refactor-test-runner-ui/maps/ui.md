# 🗺️ Cây "À, nghĩa là..." — Chi tiết thiết kế UI

Đây là cây phân rã chi tiết thiết kế giao diện cho SinoMedia Test Runner Dashboard.

## 1. Hệ thống Màu sắc (Theme System)
- **À, nghĩa là...** chúng ta cần định nghĩa các CSS Variables cho cả 2 theme `light` và `dark` dựa trên `color.json`:
  - `light`:
    - Canvas Background: `oklch(0.9875 0 0)` (#fcfcfc)
    - Foreground Text: `rgb(49, 49, 49)` (#313131)
    - Card Background: `#ffffff`
    - Border Color: `oklch(0.145 0 0 / 0.1)` (rgba(0, 0, 0, 0.08))
    - Muted Text: `oklch(0.556 0 0)` (#737373)
  - `dark`:
    - Canvas Background: `oklch(0.145 0 0)` (#212121)
    - Foreground Text: `oklch(0.985 0 0)` (#fafafa)
    - Card Background: `oklch(0.205 0 0)` (#303030)
    - Border Color: `oklch(1 0 0 / 10%)` (rgba(255, 255, 255, 0.1))
    - Muted Text: `oklch(0.708 0 0)` (#a3a3a3)
  - Chung:
    - Primary Blue: `rgb(0, 81, 195)` (light) / `oklch(0.488 0.243 264.376)` or `#3b82f6` (dark)
    - Brand Orange: `rgb(246, 130, 31)` (#f6821f)
    - Success Green: `#10b981` (light/dark bg/text matching semantic specs)
    - Failure Red: `#ef4444` (destructive)
    - Warning Yellow: `#f59e0b`
- **À, nghĩa là...** cần một nút chuyển đổi giao diện (Theme Toggle Icon) ở Header để chuyển lớp `.light` hoặc `.dark` trên thẻ `<html>` hoặc `<body>` và lưu tùy chọn vào `localStorage`.

## 2. Bố cục Shell (Layout Grid)
- **À, nghĩa là...** giao diện không chỉ nằm giữa trang 1200px mà sẽ mở rộng toàn màn hình với Sidebar bên trái cố định 260px và Content Area cuộn độc lập bên phải:
  - Mobile: Sidebar ẩn, có nút hamburger kích hoạt drawer.
  - Desktop: Sidebar hiện cố định.
- **À, nghĩa là...** Sidebar sẽ chứa logo SinoMedia (chữ màu Brand Orange và biểu tượng sparkles), tiêu đề "Test Automation", các thông số thống kê rút gọn (Quick Stats) và các nút điều khiển nhanh (Run All, Run UI, Run Backend) để người dùng có thể kích hoạt nhanh từ bất kỳ đâu.
- **À, nghĩa là...** Main Content bên phải sẽ có Header bar 56px với breadcrumbs định vị và các action phụ.

## 3. Module Grid (Registry)
- **À, nghĩa là...** các thẻ module card phải có thiết kế phẳng, gọn gàng, viền mảnh 1px.
- **À, nghĩa là...** tiêu đề module dùng cỡ chữ nhỏ gọn `font-semibold text-sm` thay vì to thô, mô tả ngắn gọn `text-xs text-muted`.
- **À, nghĩa là...** nút "Chạy Module" sử dụng style `btn-secondary` chiều cao `h-7` (hoặc `h-8`) và thay đổi trạng thái mờ (disabled) khi có test đang chạy toàn hệ thống.

## 4. Chi tiết Bảng kết quả (Test cases table)
- **À, nghĩa là...** bảng phải có cấu trúc cực kỳ cô đọng (information-dense), padding nhỏ (`py-2 px-3`), cỡ chữ `text-xs`.
- **À, nghĩa là...** ID test case dùng font monospace, màu nhấn xanh dương hoặc cam nhạt để nổi bật.
- **À, nghĩa là...** trạng thái badge có màu nền mờ nhạt (opacity 10-15%) phối cùng chữ màu gốc (ví dụ: PASS = xanh nền 10%, chữ xanh đậm) để tạo hiệu ứng dễ chịu và chuyên nghiệp.
- **À, nghĩa là...** phần hiển thị lỗi (`error-log`) sẽ nằm gọn gàng bên dưới mô tả test case, sử dụng font monospace, nền đỏ rất nhạt, hỗ trợ cuộn dọc nếu log lỗi quá dài.

## 5. Bảng hiển thị Console Log (Terminal)
- **À, nghĩa là...** console giả lập phải giữ nguyên tông màu tối chuyên nghiệp (`#090d16` hoặc tương đương) để hiển thị dòng log một cách tương phản và rõ ràng.
- **À, nghĩa là...** cần bổ sung thanh công cụ (control bar) nhỏ phía trên console:
  - Toggle Auto-scroll (để người dùng có thể tắt cuộn tự động và đọc log cũ).
  - Clear console (xóa màn hình).
  - Tải file log `.txt` (lưu nội dung log hiện tại).
  - Trạng thái tiến trình (Running, Success, Idle, Error).
