# Tích Hợp Xoay Vòng Tài Khoản Douyin (Account Rotation Pool)

> **Ngày thực hiện:** 2026-07-02
> **Phạm vi:** `crawler-pipeline/src/crawl/douyin/`, `crawler-pipeline/src/store/account_pool.ts`

---

## Tích Hợp Xoay Vòng Tài Khoản & Quản Lý Session Douyin

> [!NOTE]
> **Cập nhật ngày 2026-07-10:** Hệ thống đã loại bỏ hoàn toàn `CloakBrowser`. Cơ chế đăng nhập tương tác bằng trình duyệt đã bị vô hiệu hóa; crawler hiện hoạt động theo mô hình **HTTP-First, Fail-Fast** (báo lỗi hết hạn session thay vì khởi động trình duyệt). Mọi cấu hình liên quan đến `CloakBrowser` dưới đây đã được thay bằng fail-fast error.

Tài liệu này mô tả chi tiết giải pháp tích hợp xoay vòng tài khoản (Account Rotation) và quản lý phiên (Session Management) cho nền tảng Douyin trong SinoMedia. Hệ thống hỗ trợ crawler Douyin hoạt động 24/7 tự trị bằng cách tự động lấy tài khoản từ database, kiểm tra sức khỏe, và fallback về cookie cục bộ hoặc chế độ khách (Guest) khi pool trống.

---

## Các File Đã Thay Đổi

### 1. `crawler-pipeline/src/crawl/douyin/client.ts`
- **Thêm biến `tempSessionOverride`**: Lưu phiên tạm thời được inject từ database.
- **Thêm hàm `setDouyinSession(cookies, msToken)`**: Cho phép ghi đè cookie + msToken tạm thời, hoặc reset về `null` để dùng cookie cục bộ.
- **Thêm hàm `getEffectiveSession()`**: Ưu tiên trả về `tempSessionOverride` nếu có, nếu không thì fallback về `loadSession()` đọc từ file `session.json`.
- **Thêm hàm `checkSessionAlive()`**: Gọi API Douyin `/aweme/v1/web/user/profile/self/` để kiểm tra xem cookie hiện tại còn hoạt động không. Trả về `true` nếu lấy được `nickname`, `false` nếu lỗi.

### 2. `crawler-pipeline/src/crawl/douyin/core.ts`
- **Thêm hàm `ensureLogin()`**: Hàm điều phối chính, thực hiện theo thứ tự:
  1. Lặp tối đa 5 lần gọi `checkoutAccount("douyin")` lấy tài khoản từ Supabase.
  2. Parse `cookie_data` (hỗ trợ cả JSON Chrome Cookie lẫn chuỗi cookie thô dạng `name=value; name2=value2`).
  3. Inject vào client qua `setDouyinSession()`.
  4. Kiểm tra hoạt động qua `checkSessionAlive()`.
  5. Nếu tài khoản không hoạt động → `checkinAccount(id, false)` → thử tài khoản tiếp theo.
  6. Nếu hết tài khoản DB → reset `setDouyinSession(null)` → thử cookie cục bộ. Nếu cookie cục bộ cũng hết hạn → báo lỗi browser mode removed.
- **Biến `currentAccountId`**: Theo dõi tài khoản đang sử dụng để báo cáo kết quả.
- **Bọc tất cả method của `DouyinCrawler`** (`crawl`, `creator`, `search`, `comments`) trong `try/catch` để:
  - Gọi `checkinAccount(id, true)` khi thành công.
  - Gọi `checkinAccount(id, false)` khi thất bại.

### 3. `crawler-pipeline/src/store/account_pool.ts`
- **Sửa lỗi cú pháp PostgREST**: Thay đổi `order: "last_used_at.nullsfirst.asc"` thành `order: "last_used_at.asc.nullsfirst"`. Cú pháp cũ gây lỗi HTTP 400 từ Supabase REST API.

### 4. `crawler-pipeline/src/index.ts`
- **Thêm lệnh CLI `add-account`**: Cho phép đẩy cookie lên database Supabase từ dòng lệnh.
- Cú pháp: `npm run add-account <platform> <username> <cookie_or_json_file_path>`
- Hỗ trợ cả file JSON cookie Chrome và chuỗi cookie thô.

### 5. `crawler-pipeline/tests/douyin-test-cases.md`
- Tài liệu mô tả 9 kịch bản kiểm thử (4 Functional, 1 Edge Case, 4 Rotation).

---

## Lỗi Đã Phát Hiện & Khắc Phục

### Lỗi 1: TypeScript Type Mismatch — `BrowserContext`
- **Nguyên nhân:** Thư viện `cloakbrowser` dùng phiên bản `playwright-core` khác với dự án, dẫn đến kiểu `BrowserContext` không tương thích (thiếu property `credentials`).
- **Cách sửa:** Cast kết quả `launchPersistentContext()` sang `any` tại `core.ts` dòng 74.
- **File:** `crawler-pipeline/src/crawl/douyin/core.ts`

### Lỗi 2: TypeScript — `msToken` optional
- **Nguyên nhân:** Interface `LoginResult` khai báo `msToken?: string` (optional), nhưng `saveSession()` yêu cầu `msToken: string` (required).
- **Cách sửa:** Thêm fallback `result.msToken || ""` khi gọi `saveSession()`.
- **File:** `crawler-pipeline/src/crawl/douyin/core.ts` dòng 89.

### Lỗi 3: PostgREST Order Syntax
- **Nguyên nhân:** Supabase PostgREST yêu cầu cú pháp sắp xếp là `column.direction.nulls` (ví dụ: `last_used_at.asc.nullsfirst`), nhưng code cũ viết sai thành `last_used_at.nullsfirst.asc`.
- **Triệu chứng:** HTTP 400, message: `"failed to parse order"`.
- **Cách sửa:** Đổi thứ tự thành `last_used_at.asc.nullsfirst`.
- **File:** `crawler-pipeline/src/store/account_pool.ts` dòng 59.

---

## Kết Quả Kiểm Thử

### TypeScript Compile Check
- `npx tsc --noEmit` → **PASS** (0 lỗi).

### Rotation State Machine Test (Tự động)
Chạy script `tests/rotation_test.ts` mô phỏng vòng đời tài khoản trên Supabase thực:

| Bước | Hành động | Kết quả | Trạng thái |
|------|-----------|---------|------------|
| 1 | `addOrUpdateAccount` | Thêm tài khoản test thành công | `active` |
| 2 | `checkoutAccount` | Lấy đúng tài khoản, cập nhật `last_used_at` | `active` |
| 3 | `checkinAccount(id, true)` | `failure_count = 0` | `active` |
| 4 | `checkinAccount(id, false)` | `failure_count = 1` | `active` |
| 5 | `checkinAccount(id, false)` | `failure_count = 2` | `active` |
| 6 | `checkinAccount(id, false)` | `failure_count = 3`, tự động khóa | `banned` |
| 7 | Dọn dẹp (DELETE) | Xóa tài khoản test | — |

**Kết quả:** Exit code 0 — **PASS**.

### Fallback Test (Thủ công)
- Chạy `npm run crawl -- -p douyin <video_id>` khi không có tài khoản DB hoạt động.
- Crawler tự động in log: `"Không có tài khoản hoạt động nào từ Pool DB. Đang thử bằng cookie cục bộ..."`.
- Tiếp tục tải 29 cookies từ browser context cục bộ và hoạt động bình thường.
- **Kết quả: PASS** — không crash, fallback hoạt động đúng.

---

## Kiến Trúc Luồng Xoay Vòng (Flow)

```
ensureLogin()
  │
  ├─ [1] checkoutAccount("douyin") → Supabase DB
  │     ├─ Có tài khoản → parse cookie → setDouyinSession() → checkSessionAlive()
  │     │     ├─ Hoạt động → Sẵn sàng cào (gán currentAccountId)
  │     │     └─ Không hoạt động → checkinAccount(id, false) → thử tài khoản tiếp
  │     └─ Không có tài khoản (pool trống)
  │
  ├─ [2] Fallback cookie cục bộ
  │     ├─ setDouyinSession(null) → loadSession() từ session.json
  │     ├─ checkSessionAlive()
  │     │     ├─ Hoạt động → Sẵn sàng cào
  │     │     └─ Hết hạn → Bước 3
  │
  └─ [3] Báo lỗi browser mode removed
        ├─ Thành công → saveSession() + tiếp tục cào
        └─ Thất bại → Chế độ ẩn danh (Guest)

DouyinCrawler.crawl/creator/search/comments()
  │
  ├─ ensureLogin()
  ├─ Thực hiện cào
  ├─ try: checkinAccount(currentAccountId, true)   ← thành công
  └─ catch: checkinAccount(currentAccountId, false) ← thất bại
```

---

## Bảng Supabase Liên Quan

### `crawler_accounts`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | uuid (PK) | ID tự sinh |
| `platform` | text | `"douyin"`, `"bilibili"`, ... |
| `username` | text | Tên tài khoản |
| `cookie_data` | text | Cookie dạng chuỗi hoặc JSON |
| `status` | text | `"active"` / `"banned"` |
| `failure_count` | int | Số lần lỗi liên tiếp (reset về 0 khi thành công) |
| `last_used_at` | timestamptz | Thời điểm sử dụng gần nhất |
| `created_at` | timestamptz | Thời điểm tạo |

**Quy tắc tự động khóa:** Khi `failure_count >= 3`, hệ thống tự động cập nhật `status` thành `"banned"`.

---

## Lưu Ý Quan Trọng

1. **Thứ tự ưu tiên session:** `tempSessionOverride` (DB) → `session.json` (cục bộ) → Báo lỗi và dừng → Guest mode.
2. **PostgREST order syntax:** Luôn dùng `column.direction.nulls` — ví dụ `last_used_at.asc.nullsfirst`, KHÔNG phải `last_used_at.nullsfirst.asc`.
3. **Loại bỏ CloakBrowser context hoàn toàn.
4. **`msToken` là optional trong `LoginResult`:** Luôn dùng `result.msToken || ""` khi truyền vào `saveSession()`.
