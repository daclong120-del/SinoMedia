# Walkthrough - Tối ưu hóa Tạo nhiệm vụ, RLS Security, Realtime Sync & Sửa lỗi Bilibili Crawler

Tài liệu này tổng hợp toàn bộ các thay đổi nâng cao đã được thực hiện để giải quyết triệt để lỗi logic nạp nhiệm vụ, bảo mật cơ sở dữ liệu, hiển thị lỗi realtime và ổn định hóa tài khoản cào.

## Các thay đổi đã thực hiện

### 1. Cơ chế Timeout Chống Treo Worker (Anti-hang) ⚡
- **Vấn đề**: Khi cào dữ liệu (đặc biệt là cào bình luận hoặc search), các API request không có timeout hoặc Playwright có thể bị đơ vĩnh viễn do mạng hoặc proxy chết. Do worker chạy trên vòng lặp `while (true)` tuần tự, nếu một task bị treo, toàn bộ hàng đợi (queue) sẽ bị nghẽn (stuck) và các task pending sau đó (như `cat`) không bao giờ được claim.
- **Giải pháp**:
  - **Task Timeout (180s)**: Trong [queue_worker.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/queue_worker.ts), hàm `executeTask` được bọc bằng `Promise.race` cùng một `timeoutPromise` giới hạn **3 phút** (180 giây). Nếu nhiệm vụ cào vượt quá 3 phút, worker sẽ tự ném lỗi timeout, tự động nhảy vào khối `finally` để đóng browser Playwright (`closeBrowser()`) giải phóng tài nguyên và cập nhật trạng thái `failed` lên Supabase để chuyển sang xử lý task tiếp theo.
  - **API Timeout (30s)**: Trong [client.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/crawl/bilibili/client.ts), tất cả các fetch request (cho cả native fetch và impit fetch) đều được tích hợp `AbortSignal.timeout(30000)` (30 giây) để ngắt các kết nối mạng bị treo lơ lửng.

### 2. Phân tách Semantic: Giải phóng tài khoản Trung lập (`releaseAccount`)
- **Vấn đề**: Khi xảy ra lỗi target (nhập sai định dạng), crawler checkin account với `isSuccess = true` để không bị ban. Tuy nhiên, hành động này vô tình reset `failure_count = 0` (heal account) dù trước đó tài khoản đó thật sự bị lỗi.
- **Giải pháp**:
  - Định nghĩa thêm hàm `releaseAccount(accountId)` trong [account_pool.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/store/account_pool.ts). Hàm này trả tài khoản về pool mà **không hề làm thay đổi** `failure_count` hay `status`.
  - Trong [core.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/crawl/bilibili/core.ts), khi crawler Bilibili bắt được lỗi target (`isInputOrTargetError`), nó sẽ gọi `releaseAccount()` để giải phóng tài khoản một cách trung lập. Chỉ các lỗi thực tế liên quan đến auth/cookie mới gọi `checkinAccount(..., false)` làm tăng `failure_count`.

### 3. Sửa lỗi logic xác thực "ảo" của hàm `pong()`
- **Vấn đề**: Hàm `pong()` trong [client.ts](file:///d:/Python/SinoMedia/crawler-pipeline/src/crawl/bilibili/client.ts) kiểm tra cookie bằng cách gọi API `/x/web-interface/nav`. Code cũ kiểm tra kiểu dữ liệu `boolean` của `isLogin` khiến cho kết quả `false` (chưa đăng nhập) cũng trả về `true` (xác thực thành công).
- **Giải pháp**:
  - Thay đổi logic kiểm tra thành: `return resp && resp.isLogin === true;` để đảm bảo chỉ khi đã đăng nhập thành công mới báo tài khoản hoạt động.

### 4. Tái cấu trúc Scope biến `currentAccountId` thành local `LoginSession`
- **Vấn đề**: `currentAccountId` được khai báo là biến global ở module-level. Điều này dẫn tới nguy cơ nhiễm trạng thái (state pollution) hoặc race condition khi có nhiều task chạy song song.
- **Giải pháp**:
  - Xóa biến global `currentAccountId`.
  - Cập nhật hàm `ensureLogin()` trả về `Promise<LoginSession>` chứa thông tin session cục bộ `{ mode: "account", accountId }` hoặc `{ mode: "guest" }`.
  - Trong các phương thức cào, lưu session vào biến block-scoped cục bộ và chỉ xử phạt/trả tài khoản khi cào thất bại/thành công nếu cào bằng chế độ `"account"`.

### 5. Đồng bộ lỗi chi tiết thời gian thực trên UI (Realtime sync)
- **Vấn đề**: Khi task cào kết thúc với trạng thái `failed`, database cập nhật `error_message`. Tuy nhiên trên UI danh sách nhiệm vụ không hiện chi tiết lỗi do mapper WebSocket `mapDbTask` trong [subscriptions.ts](file:///d:/Python/SinoMedia/dashboard/lib/realtime/subscriptions.ts) bỏ quên không ánh xạ trường `error_message`.
- **Giải pháp**:
  - Bổ sung trường `error_message` vào hàm `mapDbTask()` để dữ liệu truyền trực tiếp qua WebSocket hiển thị đầy đủ chi tiết lỗi trên giao diện.

### 6. Thắt chặt Bảo mật Row-Level Security (RLS) cho Admin
- **Vấn đề**: Quyền SELECT rộng rãi cho tất cả người dùng `authenticated` để xem danh sách tài khoản có nguy cơ rò rỉ trường nhạy cảm `cookie_data`.
- **Giải pháp**:
  - Tạo file migration mới [20260708000003_restrict_crawler_rls.sql](file:///d:/Python/SinoMedia/supabase/migrations/20260708000003_restrict_crawler_rls.sql).
  - Cấu hình chính sách SELECT cho bảng `crawler_accounts` và `crawler_proxies` chỉ dành riêng cho Admin (`public.is_admin(auth.uid())`).
  - Áp dụng migration trực tiếp lên DB local.

---

## Kết quả kiểm thử & Xác minh
- **TypeScript Compiler**: Biên dịch thành công không lỗi ở cả `dashboard` và `crawler-pipeline`.
  - `npx.cmd tsc --noEmit`
- **Linter**: Chạy `npm run lint` trên dashboard vượt qua 100% không cảnh báo.
- **Database Migration**: Áp dụng thành công các restricted RLS policies lên database local qua `npx supabase migration up`.
