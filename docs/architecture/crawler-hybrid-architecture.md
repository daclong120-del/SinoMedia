# 🕷️ Kiến Trúc Cào Dữ Liệu HTTP-First: Không Trình Duyệt Tương Tác

Tài liệu này mô tả kiến trúc cào dữ liệu tối ưu của SinoMedia sau khi loại bỏ hoàn toàn **CloakBrowser** (trình duyệt tương tác). Hệ thống chuyển hẳn sang mô hình **HTTP-First** nhằm tối ưu hóa bộ nhớ RAM, tăng tính ổn định trên môi trường Docker/Production và giảm thiểu chi phí vận hành.

---

## 🎯 1. Nguyên Tắc Cốt Lõi

> **Crawler không tự đăng nhập bằng UI nữa.**
> Mọi crawler chỉ nhận credential (cookie, session, token) đã được cấp và chuẩn bị trước từ Database hoặc cấu hình cục bộ. Khi chạy, crawler thực hiện kiểm tra trạng thái sống/chết của session; nếu dùng được thì tiếp tục cào, nếu không dùng được thì **fail fast** và báo lỗi có cấu trúc.

---

## 🧱 2. Bối Cảnh & Lý Do Thay Đổi

Trước đây, SinoMedia sử dụng cơ chế hybrid (lai): dùng `CloakBrowser` (Chromium được vá tầng C++) để vượt qua thử thách bot và sinh chữ ký/cookie lúc đăng nhập, sau đó chuyển cookie cho HTTP cào tiếp.

Tuy nhiên, mô hình này gặp các trở ngại lớn:
1. **Quá tải tài nguyên**: Trình duyệt Chromium ngốn tối thiểu ~300-400MB RAM cho mỗi tab hoạt động, dễ gây lỗi OOM (Out Of Memory) trên VPS 1GB hoặc 2GB khi chạy nhiều crawler song song.
2. **Không tương thích Docker**: CloakBrowser sử dụng giao thức file: protocol nội bộ và Playwright, gây khó khăn cho việc đóng gói Docker và triển khai lên máy chủ Linux headless.
3. **Phụ thuộc thủ công**: Luồng fallback mở trình duyệt bắt quét mã QR hoặc đăng nhập thủ công làm gián đoạn chu kỳ tự động của Queue Worker.

---

## 🗺️ 3. Sơ Đồ Kiến Trúc HTTP-First

```text
┌─────────────────────────────────────────────────────────┐
│              TẦNG ĐIỀU KHIỂN (Dashboard / DB)           │
│   • Quản lý tài khoản cào (crawler_accounts)            │
│   • Cung cấp cookie/session còn sống                    │
│   • Cấp phát Task cào cho các Crawler Workers           │
└───────────────────────────┬─────────────────────────────┘
                            │ (Lấy task + account cookie)
                            ▼
┌─────────────────────────────────────────────────────────┐
│          TẦNG CRAWL WORKERS (Không Trình Duyệt)         │
│   • Chạy nhẹ nhàng trên Docker (chỉ tốn ~100-200MB RAM)  │
│   • Sử dụng cookie được cấu hình sẵn để cào dữ liệu     │
│   • Tự động ký các tham số bảo mật (a_bogus qua JS local)│
│   • Gửi HTTP requests (impit để giả TLS/JA3 trên Linux) │
│   • Phát hiện session chết -> Trả task & Báo lỗi ngay   │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 4. Phân Vai Xử Lý Theo Nền Tảng

Hệ thống phân tách các nền tảng dựa trên mức độ hỗ trợ cào thuần HTTP:

| Nền tảng | Cơ chế HTTP | Trạng thái Fallback |
|---|---|---|
| **Douyin** | Chạy HTTP thuần sử dụng `impit` (Linux/Production) hoặc `fetch` (Windows) kết hợp hàm ký `signDetail()` cục bộ. | Không mở browser. Nếu session Pool + local hết hạn -> Báo lỗi `browser mode removed`. |
| **Bilibili** | Chạy HTTP thô sử dụng `nav` API và WBI signature cục bộ. | Không mở browser. Nếu session chết -> Báo lỗi `browser mode removed`. |
| **Zhihu** | Chạy HTTP thô sử dụng `x-zse-96` signature cục bộ. | Không mở browser. Nếu session chết -> Báo lỗi `browser mode removed`. |
| **Weibo, Tieba, Kuaishou, XHS** | Chưa hỗ trợ HTTP-only hoàn toàn do thuật toán sinh chữ ký phức tạp. | Báo lỗi lập tức khi khởi chạy: `browser mode removed, provide valid cookie/session`. |

---

## ⚙️ 5. Quy Trình Vận Hành An Toàn

1. **Cung cấp cookie trước**: Admin nạp cookie sống vào Dashboard (`/dash/accounts`) hoặc khai báo qua biến môi trường (Ví dụ `DOUYIN_COOKIE`, `ZHIHU_COOKIE`).
2. **Chuẩn hóa cookie**: Hệ thống tự động chuẩn hóa các chuỗi cookie thô hoặc dạng JSON array trước khi lưu vào DB.
3. **Kiểm tra sống chết (Heartbeat)**: Khi worker nhận task, nó sẽ gọi API Profile tự thân của nền tảng (Ví dụ `/aweme/v1/web/user/profile/self/` của Douyin) để xác thực.
4. **Dừng cào và báo lỗi**: Nếu API trả về mã lỗi auth, worker đánh dấu tài khoản lỗi trong DB và hủy task lập tức, tạo log lỗi chi tiết để quản trị viên phát hiện và thay thế cookie.
