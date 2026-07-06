# 🌲 MAP — Cây "À, nghĩa là..." cho Chữ ký XHS

## 📍 Bản đồ quyết định thiết kế và thực thi

### 1. Thuật toán phụ trợ (Helper Signature Code)
- `mrc(e: string): number`
  - ➔ à, nghĩa là cần bảng `CRC32_TABLE` của XHS ➔ Sao chép chính xác từ file `xhs_sign.py`.
  - ➔ à, nghĩa là cần unsigned right shift `>>> 8` để mô phỏng chính xác toán tử của JS gốc ➔ Dùng toán tử `>>>` tiêu chuẩn trong TS.
  - ➔ à, nghĩa là chỉ chạy tối đa 57 ký tự (`Math.min(57, e.length)`) ➔ Thiết lập vòng lặp giới hạn.
- `b64Encode(data: number[]): string`
  - ➔ à, nghĩa là cần bảng chữ cái Base64 xáo trộn của XHS: `"ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5"` ➔ Đặt hằng số `BASE64_CHARS`.
  - ➔ à, nghĩa là cần phân mảnh chunk (remainder 1 và 2) để thêm ký tự đệm `=` hoặc `==` ➔ Port chính xác hàm `b64Encode` từ `xhs_sign.py`.
- `encodeUtf8(s: string): number[]`
  - ➔ à, nghĩa là cần chuyển chuỗi JSON/URL thành mảng byte UTF-8 ➔ Dùng `new TextEncoder().encode(s)` rồi chuyển sang mảng thường (`Array.from(...)`).
- `getB3TraceId(): string`
  - ➔ à, nghĩa là cần chuỗi ngẫu nhiên 16 ký tự hex ➔ Viết hàm sinh chuỗi hex ngẫu nhiên.

### 2. Playwright Signature Bridge (XhsClient.sign)
- Gọi `window._webmsxyw` từ trình duyệt:
  - ➔ à, nghĩa là cần trang Playwright hoạt động (`playwrightPage`) ➔ Thêm method `setPage(page: Page)` vào `XhsClient`.
  - ➔ à, nghĩa là trình duyệt cần đang mở trang chủ hoặc trang API XHS trước khi ký để tránh lỗi `window._webmsxyw is not a function` ➔ Điều hướng tới `https://www.xiaohongshu.com` và chờ load trước khi ký.
  - ➔ à, nghĩa là cần cấu trúc tham số đầu vào cho `_webmsxyw(uri, data)` ➔ Với POST dùng payload JSON, với GET dựng chuỗi query tương thích.

---
*Trạng thái: ⏳ Chưa bắt đầu*
