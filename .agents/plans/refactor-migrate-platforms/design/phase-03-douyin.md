# 📐 Thiết kế Kỹ thuật Phase 3 — Douyin Crawler & Account Rotation

Tài liệu này đặc tả luồng thiết kế tích hợp Douyin Crawler vào hệ thống xoay vòng tài khoản tự động qua Supabase.

---

## 1. Thiết Kế Luồng Đăng Nhập & Kiểm Tra (Auth & Verification Flow)

```text
Khởi chạy Douyin Crawler
          │
          ▼
Gọi ensureLogin(): checkoutAccount("douyin") từ Supabase
          │
          ├──► Có tài khoản active?
          │         │
          │         ▼
          │   Nạp session (cookies, msToken) vào Client qua setDouyinSession
          │   Gọi checkSessionAlive() để kiểm tra kết nối
          │         │
          │         ├──► Hợp lệ: Bắt đầu cào dữ liệu
          │         │
          │         └──► Không hợp lệ (Expired/Banned): 
          │                   Gọi checkinAccount(accountId, success=false)
          │                   Quay lại checkout tài khoản khác
          │
          └──► Không có tài khoản nào hoạt động?
                    │
                    ▼
              Fallback về chế độ Khách (Guest Mode / Ẩn danh)
```

---

## 2. Chi Tiết Thay Đổi Kỹ Thuật

### A. Tích hợp Quản lý Session trên Client (`src/crawl/douyin/client.ts`)
- Cung cấp cơ chế `tempSessionOverride` chứa danh sách cookie và `msToken` nhận được từ database.
- Hàm `douyinRequest` và `douyinGet` sẽ đọc cookie từ `tempSessionOverride` thay vì đọc từ file `session` cục bộ.
- Xây dựng API kiểm tra trạng thái hoạt động:
  ```typescript
  async function checkSessionAlive(): Promise<boolean>
  ```
  API này sẽ gửi request đến `/aweme/v1/web/user/profile/self/` để kiểm tra cookie.

### B. Cơ chế Báo cáo Kết quả trên Core (`src/crawl/douyin/core.ts`)
- Cấu trúc lại class `DouyinCrawler` kế thừa `ICrawler`.
- Bọc toàn bộ các hàm chức năng (`crawl`, `creator`, `search`, `comments`) trong các khối `try/catch` để:
  - Gọi `checkinAccount(accountId, true)` nếu cào thành công.
  - Gọi `checkinAccount(accountId, false)` nếu gặp lỗi mạng, bị chặn hoặc mã lỗi đặc trưng từ Douyin.
