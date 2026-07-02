# 📐 Hệ Thống Xoay Vòng Tài Khoản (Account Rotation Pool)

Tài liệu này đặc tả thiết kế kỹ thuật, cấu trúc bảng dữ liệu và cơ chế hoạt động của hệ thống xoay vòng tài khoản tự động (Account Rotation Pool) kết nối với Supabase dành cho Crawler.

---

## 1. Thiết Kế Cơ Sở Dữ Liệu (Supabase Schema)

Bảng `crawler_accounts` được tạo trong schema `public` để quản lý tập trung danh sách tài khoản của tất cả các nền tảng:

```sql
create table public.crawler_accounts (
  id uuid default gen_random_uuid() primary key,
  platform text not null,                     -- 'bilibili', 'zhihu', 'douyin', v.v.
  username text not null,                     -- Tên tài khoản để phân biệt
  cookie_data text not null,                  -- Dữ liệu cookie dạng chuỗi ghép
  status text default 'active' 
    constraint check_status check (status in ('active', 'expired', 'banned')),
  failure_count int default 0,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint unique_platform_username unique (platform, username)
);

create index idx_crawler_accounts_rotation 
on public.crawler_accounts (platform, status, last_used_at);

alter table public.crawler_accounts enable row level security;
```

---

## 2. Luồng Hoạt Động (Rotation & Lifecycle Flow)

Hệ thống hoạt động theo mô hình xoay vòng dựa trên thời gian sử dụng cuối (`last_used_at`):

```text
       Yêu cầu cào dữ liệu Bilibili
                    │
                    ▼
          [ Rút tài khoản (Checkout) ]
   Lấy tài khoản 'active' có last_used_at lâu nhất
                    │
      ┌─────────────┴─────────────┐
      ▼                           ▼
[Có tài khoản]              [Không còn tài khoản nào]
      │                           │
      ▼                           ▼
Gán Cookie vào client      Chuyển sang chế độ Khách (Guest Mode)
      │                           │
      ▼                           ▼
Kiểm tra đăng nhập (pong)       Thực hiện cào ẩn danh
      │
      ├───────────────────────────┐
      ▼ (Thành công)               ▼ (Thất bại)
Thực hiện tác vụ cào         Báo cáo lỗi (Failure Count +1)
      │                            │
      ▼                            ├──► Đạt 3 lần liên tiếp? ──► [ Khóa - Banned ]
Báo cáo thành công (Checkin)      │
(Reset failure_count = 0,          ▼
 cập nhật last_used_at)       Thử tài khoản tiếp theo
```

---

## 3. Các Thành Phần Mã Nguồn (Key Files)

### A. Quản lý API Pool (`crawler-pipeline/src/store/account_pool.ts`)
- **`checkoutAccount(platform)`**: Rút tài khoản khả dụng lâu nhất chưa dùng.
- **`checkinAccount(id, success)`**: Trả tài khoản về pool.
  - Nếu `success = true`: Đặt lại `failure_count = 0`, cập nhật `last_used_at`.
  - Nếu `success = false`: Tăng `failure_count` lên 1. Nếu vượt quá `3`, chuyển trạng thái sang `banned`.
- **`addOrUpdateAccount(platform, username, cookieData)`**: Thêm hoặc cập nhật tài khoản từ CLI.

### B. Tích hợp Crawler (`crawler-pipeline/src/crawl/bilibili/core.ts`)
- Tích hợp hàm `ensureLogin()` để thực hiện tự động rút tài khoản từ database, cấu hình vào `BilibiliClient`.
- Bọc toàn bộ các tác vụ cào (`crawl`, `creator`, `search`, `comments`) trong khối `try/catch` để gọi `checkinAccount` báo cáo trạng thái thành công hoặc thất bại về database.

### C. Công cụ CLI (`crawler-pipeline/src/index.ts`)
- Đăng ký lệnh `add-account` để đẩy cookie vào cơ sở dữ liệu một cách nhanh chóng.
- Hỗ trợ cả hai định dạng: Định dạng mảng JSON xuất từ trình duyệt (EditThisCookie/GetCookie) hoặc chuỗi Cookie thô (`raw string`).

---

## 4. Hướng Dẫn Sử Dụng & Vận Hành

### A. Cấu hình biến môi trường
Mã nguồn đọc khóa API từ các file môi trường. Để đảm bảo an toàn bảo mật, khóa quản trị được lưu trong:
- **Tệp**: `supabase/.env.local` (được đưa vào `.gitignore` để không bị lộ trên git).
- **Giá trị**:
  ```env
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
  ```

### B. Đẩy tài khoản mới lên database
Chạy lệnh từ thư mục `crawler-pipeline`:
```bash
npm run add-account <platform> <username> <path_to_cookie_file_or_string>
```
*Ví dụ:*
```bash
npm run add-account bilibili account_test d:\Python\expo-supabase-ai-template\cookie-bili.json
```

### C. Theo dõi và bảo trì
- **Khôi phục tài khoản bị khóa**: Nếu tài khoản bị đổi trạng thái sang `banned` hoặc `expired` do cookie hết hạn, cập nhật lại cookie mới qua lệnh `add-account` sẽ tự động reset trạng thái về `active` và `failure_count` về `0`.
- **Chế độ khách**: Nếu toàn bộ tài khoản bị khóa hoặc không có tài khoản hoạt động, Crawler sẽ tự động chuyển sang chế độ khách (Guest mode) để tiếp tục hoạt động mà không làm sập luồng worker.
