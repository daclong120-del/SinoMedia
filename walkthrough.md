# Walkthrough - Tối ưu hóa Tạo nhiệm vụ, RLS Security, Realtime Sync & Sửa lỗi Bilibili Crawler

Tài liệu này tổng hợp toàn bộ các thay đổi nâng cao đã được thực hiện để giải quyết triệt để lỗi logic nạp nhiệm vụ, bảo mật cơ sở dữ liệu, hiển thị lỗi realtime và ổn định hóa tài khoản cào.

## Các thay đổi đã thực hiện

### 1. Phân tách Semantic: Giải phóng tài khoản Trung lập (`releaseAccount`)
- **Vấn đề trước đó**: Khi xảy ra lỗi target (nhập sai định dạng), crawler checkin account với `isSuccess = true` để không bị ban. Tuy nhiên, hành động này vô tình reset `failure_count = 0` (heal account) dù trước đó tài khoản đó thật sự bị lỗi.
- **Giải pháp**:
  - Định nghĩa thêm hàm `releaseAccount(accountId)` trong [account_pool.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/store/account_pool.ts) và export qua [index.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/store/index.ts). Hàm này trả tài khoản về pool mà **không hề làm thay đổi** `failure_count` hay `status`.
  - Trong [core.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/crawl/bilibili/core.ts), khi crawler Bilibili bắt được lỗi target (`isInputOrTargetError`), nó sẽ gọi `releaseAccount()` để giải phóng tài khoản một cách trung lập. Chỉ các lỗi thực tế liên quan đến auth/cookie mới gọi `checkinAccount(..., false)` làm tăng `failure_count`.

### 2. Sửa lỗi logic xác thực "ảo" của hàm `pong()`
- **Vấn đề trước đó**: Hàm `pong()` trong [client.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/crawl/bilibili/client.ts) kiểm tra cookie bằng cách gọi API `/x/web-interface/nav`. Tuy nhiên, code kiểm tra: `if (resp && typeof resp.isLogin === "boolean") return true;`. Vì khi chưa đăng nhập, `isLogin` trả về `false` (có kiểu dữ liệu là `boolean`), hàm `pong()` báo cáo tài khoản **hoạt động bình thường** (isLogin: false nhưng return true), qua mặt được khâu `ensureLogin()`.
- **Giải pháp**:
  - Thay đổi logic kiểm tra thành: `return resp && resp.isLogin === true;` để đảm bảo chỉ khi đã đăng nhập thành công mới báo tài khoản hoạt động.

### 3. Tái cấu trúc Scope biến `currentAccountId` thành local `LoginSession`
- **Vấn đề trước đó**: `currentAccountId` được khai báo là biến global ở module-level. Điều này dẫn tới nguy cơ nhiễm trạng thái (state pollution) hoặc race condition khi có nhiều task chạy song song (ví dụ task cào guest checkin nhầm account cũ).
- **Giải pháp**:
  - Xóa biến global `currentAccountId`.
  - Cập nhật hàm `ensureLogin()` trả về `Promise<LoginSession>` chứa thông tin session cục bộ `{ mode: "account", accountId }` hoặc `{ mode: "guest" }`.
  - Trong các phương thức cào (`crawl`, `creator`, `search`, `comments`), lưu session vào biến block-scoped cục bộ và chỉ xử phạt/trả tài khoản khi cào thất bại/thành công nếu cào bằng chế độ `"account"`.

### 4. Đồng bộ lỗi chi tiết thời gian thực trên UI (Realtime sync)
- **Vấn đề trước đó**: Khi task cào kết thúc với trạng thái `failed`, database cập nhật `error_message`. Tuy nhiên trên UI danh sách nhiệm vụ không hiện chi tiết lỗi. Nguyên nhân là hàm mapper WebSocket `mapDbTask` trong [subscriptions.ts](file:///d:/Python/SinoMedia/dashboard/lib/realtime/subscriptions.ts) bỏ quên không ánh xạ trường `error_message`.
- **Giải pháp**:
  - Bổ sung trường `error_message` vào hàm `mapDbTask()` để dữ liệu truyền trực tiếp qua WebSocket hiển thị đầy đủ chi tiết lỗi trên giao diện.

### 5. Tự động làm mới danh sách tài khoản (Polling)
- **Vấn đề trước đó**: Khi worker cập nhật trạng thái tài khoản (`banned`, `failure_count`), giao diện quản lý tài khoản `/dash/accounts` không tự cập nhật nếu người dùng không reload trình duyệt thủ công.
- **Giải pháp**:
  - Bổ sung cơ chế tự động làm mới dữ liệu (Polling) định kỳ mỗi 5 giây cho trang Quản lý tài khoản cào [page.tsx](file:///d:/Python/SinoMedia/dashboard/app/(main)/dash/accounts/page.tsx).

### 6. Xóa lỗi cũ khi Chạy lại (Retry Task)
- **Vấn đề trước đó**: Khi bấm nút "Chạy lại" (Retry), task chuyển sang `pending` nhưng vẫn mang thông báo lỗi cũ của lần chạy trước.
- **Giải pháp**:
  - Cập nhật hàm `updateStatus` trong [task.repo.ts](file:///d:/Python/SinoMedia/dashboard/lib/repositories/task.repo.ts) để tự động xóa lỗi cũ (`error_message = null`) khi chuyển trạng thái task về `pending`.

### 7. Thắt chặt Bảo mật Row-Level Security (RLS) cho Admin
- **Vấn đề trước đó**: Migration cũ cấp quyền `SELECT` rộng rãi cho tất cả người dùng `authenticated` để xem danh sách tài khoản, có nguy cơ rò rỉ trường nhạy cảm `cookie_data`.
- **Giải pháp**:
  - Tạo file migration mới [20260708000003_restrict_crawler_rls.sql](file:///d:/Python/SinoMedia/supabase/migrations/20260708000003_restrict_crawler_rls.sql) để thu hồi quyền SELECT rộng rãi.
  - Cấu hình chính sách SELECT cho bảng `crawler_accounts` và `crawler_proxies` chỉ dành riêng cho Admin (`public.is_admin(auth.uid())`).
  - Áp dụng migration trực tiếp lên DB local.

### 8. Tối ưu hóa Atomic Rollback của `createAccount` (Tránh xóa nhầm account cũ)
- **Vấn đề trước đó**: Logic rollback khi cấu hình/gán proxy bị lỗi sẽ gọi `deleteById(account.id)`. Nếu là cập nhật tài khoản cũ đang tồn tại, rollback sẽ vô tình xóa luôn tài khoản thật đó.
- **Giải pháp**:
  - Thêm phương thức `findByPlatformAndUsername` vào [account.repo.ts](file:///d:/Python/SinoMedia/dashboard/lib/repositories/account.repo.ts).
  - Trước khi upsert trong `createAccount` ([crawler.service.ts](file:///d:/Python/SinoMedia/dashboard/lib/services/crawler.service.ts)), kiểm tra tài khoản đã tồn tại hay chưa (`isNew`).
  - Chỉ thực hiện xóa tài khoản khi chèn proxy bị lỗi nếu tài khoản đó là **mới tạo** (`isNew === true`).

---

## Kết quả kiểm thử & Xác minh
- **TypeScript Compiler**: Biên dịch thành công không lỗi ở cả `dashboard` và `crawler-pipeline`.
  - `npx.cmd tsc --noEmit`
- **Linter**: Chạy `npm run lint` trên dashboard vượt qua 100% không cảnh báo.
- **Database Migration**: Áp dụng thành công các restricted RLS policies lên database local qua `npx supabase migration up`.
