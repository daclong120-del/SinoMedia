# Checklist: Refactor Test Runner UI

- [ ] Chuẩn bị các biến CSS màu sắc trong `automation-test/runner/index.html` cho light/dark theme.
- [ ] Thiết lập logic JS chuyển đổi theme (Theme Switcher) và lưu vào `localStorage`.
- [ ] Tái cấu trúc Layout Grid sang dạng Sidebar + Content Area toàn màn hình:
  - [ ] Thiết kế Sidebar (chứa Logo SinoMedia, thống kê rút gọn, nút điều khiển nhanh).
  - [ ] Thiết kế Header (breadcrumbs, theme toggle, nút mở report).
  - [ ] Thiết kế Content Panel cuộn.
- [ ] Tái cấu trúc CSS cho Module Registry Grid và các Module Card (nhỏ gọn, phẳng, viền mảnh).
- [ ] Reskin bảng chi tiết kết quả chạy (Table):
  - [ ] Giảm padding, thu nhỏ chữ (font text-xs).
  - [ ] Làm đẹp status badge (nền nhạt + chữ màu gốc).
  - [ ] Cải thiện hiển thị error log của test case bị thất bại.
- [ ] Cải thiện Console Logs Panel (Terminal):
  - [ ] Giữ nguyên font monospace, nền tối.
  - [ ] Thêm nút Toggle Auto-scroll.
  - [ ] Thêm nút Clear logs.
  - [ ] Thêm nút Tải Log (.txt).
- [ ] Kiểm thử hoạt động của giao diện sau khi nâng cấp trên các kích thước màn hình.
