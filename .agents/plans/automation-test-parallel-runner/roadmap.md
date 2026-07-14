# Roadmap: Automation Test Parallel Runner

Sáng kiến này nhằm tối ưu hóa hệ thống chạy kiểm thử tự động, cho phép chạy song song với nhiều cấu hình worker khác nhau (1, 2, 4, 5, 8 workers), đồng thời duy trì độ an toàn đối với các module kiểm thử đột biến (mutation/non-parallel-safe).

## 📍 Đang làm
- **Hoàn thành**: Đã hoàn thành tất cả các Phase.

---

## 📋 Danh sách các Phase

- [x] **Phase 1: Thêm tham số Worker Count vào Server Runner**
  - Cập nhật API POST `/api/runs` để chấp nhận `workers` và `parallelMode` từ client.
  - Phân tích và giới hạn (clamp) số worker hợp lệ (1-8, mặc định là 1 cho UI/module để an toàn, 4 cho API/backend).
  - Truyền `--workers=N` vào tiến trình Playwright thay vì cứng `--workers=1`.
- [x] **Phase 2: Thiết kế bảng điều khiển Workers trên UI Dashboard**
  - Thêm phần cấu hình số workers (1, 2, 4, 5, 8) và preset (Safe / Fast / Turbo) trên sidebar.
  - Hiển thị cảnh báo trực quan khi chạy chế độ song song cho các test UI.
  - Đóng gói dữ liệu workers vào payload khi kích hoạt `runTest()`.
- [x] **Phase 3: Cấu hình an toàn song song cho Module & Specs (Metadata)**
  - Mở rộng cấu hình `module.json` với thuộc tính `parallelSafe`, `recommendedWorkers`, `maxWorkers`.
  - Tự động cảnh báo hoặc khóa số worker tối đa nếu module không an toàn để chạy song song.
  - Thêm thẻ `@serial` hoặc `@parallel-safe` vào các spec file tương ứng.
- [x] **Phase 4: Bộ điều phối Scheduler nâng cao (Parallel + Serial Groups)**
  - Tách quá trình chạy toàn bộ test thành 2 đợt: Chạy các test an toàn (parallel-safe) song song trước, sau đó chạy các test tuần tự (serial) với 1 worker.
  - Hợp nhất (reconcile) các file báo cáo JSON riêng lẻ thành một kết quả chung.
- [x] **Phase 5: Đảm bảo độ ổn định và Realtime cho Parallel Execution**
  - Sửa lỗi sắp xếp thứ tự các sự kiện `test-begin` và `test-end` khi chạy song song.
  - Thêm bộ đếm thời gian chạy thực tế cho từng hàng đang chạy (elapsed timer) và tự động dọn dẹp các dòng bị treo RUNNING.
- [x] **Phase 6: Thiết lập cơ chế cô lập dữ liệu chạy test (Data Isolation)**
  - Xây dựng quy tắc tự động thêm mã hậu tố độc nhất cho thực thể kiểm thử dựa trên worker index.
  - Thiết lập cơ chế auth lưu trữ riêng biệt cho từng luồng chạy test.
