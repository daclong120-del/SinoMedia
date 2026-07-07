# Nhật ký Debug — Sửa lỗi frontend khi Supabase local offline

Ngày bắt đầu: 2026-07-07  
Initiative: `debug-getpostsperday-timeout`  
Trạng thái: ✅ xong

---

## D1 — Triệu chứng & Tái hiện

### Triệu chứng
Khi Supabase local/Docker chưa chạy, mở frontend tại `http://localhost:3000/` gặp các lỗi:
1. **Next.js Dev Overlay đỏ rực** hiển thị lỗi `Runtime Error` / `getPostsPerDay timed out`.
2. **Console hiển thị lỗi unhandled**: `AuthRetryableFetchError: Failed to fetch` và `TypeError: Failed to fetch`.
3. **UI bị đơ/kẹt**: Bấm sidebar đổi trang đôi khi không chuyển trang hoặc bị treo loading do các API loader bị nghẽn unhandled.

### Bước tái hiện
1. Đảm bảo Supabase Docker container đang tắt.
2. Chạy `npm run dev` trong thư mục `dashboard/`.
3. Truy cập `http://localhost:3000/` và click điều hướng giữa các menu sidebar (`Tìm Creative`, `Nhiệm vụ cào`, `Tài khoản cào`, `Bài viết & Video`, `Cài đặt hệ thống`).

---

## D2 — Thu thập bằng chứng (Từ phân tích Codebase)

1. **Lỗi `getPostsPerDay` unhandled**:
   - Tại [dashboard.service.ts](file:///d:/Python/SinoMedia/dashboard/lib/services/dashboard.service.ts#L146-L156):
     ```typescript
     export async function getPostsPerDay(): Promise<{ date: string; count: number }[]> {
       try {
         const db = await createClientServer();
         const postRepo = new PostRepository(db as unknown as DbClient);
         return withSupabaseTimeout(postRepo.countByDay(7), "getPostsPerDay"); // <-- Thiếu await!
       } catch (err) {
         ...
       }
     }
     ```
     *Bằng chứng*: Vì thiếu `await`, promise trả về từ `withSupabaseTimeout` thoát ra ngoài khối `try-catch` của `getPostsPerDay`. Khi timeout xảy ra, lỗi rejection không được catch, ném trực tiếp lên phía client.

2. **Lỗi thiếu bọc kết nối trong `getAccounts()`**:
   - Tại [crawler.service.ts](file:///d:/Python/SinoMedia/dashboard/lib/services/crawler.service.ts#L149-L154):
     ```typescript
     export async function getAccounts(): Promise<CrawlerAccount[]> {
       const db = await createClientServer();
       const repo = new AccountRepository(db as unknown as DbClient);
       const data = await repo.findAll(); // <-- Thiếu timeout và try-catch
       return data.map(mapDbAccount);
     }
     ```
     *Bằng chứng*: Khi offline, `repo.findAll()` ném thẳng lỗi fetch ra ngoài, khiến trang `/dash/accounts` crash.

3. **Lỗi `AuthRetryableFetchError` rác trong Middleware**:
   - Tại [middleware.ts](file:///d:/Python/SinoMedia/dashboard/lib/supabase/middleware.ts#L57-L70):
     ```typescript
     const getUserPromise = supabase.auth.getUser().then(({ data }) => data?.user || null);
     user = await Promise.race([getUserPromise, timeoutPromise]);
     ```
     *Bằng chứng*: Mặc dù `Promise.race` bọc trong `try-catch`, nếu `timeoutPromise` reject trước (sau 2 giây), `getUserPromise` vẫn chạy ngầm. Khi fetch thực sự thất bại sau đó, lỗi từ `getUserPromise` không được catch ở đâu, gây ra unhandled rejection `AuthRetryableFetchError`.

4. **Kẹt `Promise.all` tại Home Page**:
   - Tại [page.tsx](file:///d:/Python/SinoMedia/dashboard/app/%28main%29/dash/home/page.tsx#L157-L163):
     ```typescript
     const [m, d, t, pData, hData] = await Promise.all([
       getDashboardMetrics(),
       getPlatformDistribution(),
       getTasks(),
       getPostsPerDay(),
       getPlatformHealth(),
     ]);
     ```
     *Bằng chứng*: Nếu bất kỳ hàm nào reject (như `getPostsPerDay`), `Promise.all` sẽ fail toàn bộ lập tức và kẹt UI ở trạng thái loading vô chậm hoặc crash.

---

## D3 — Đưa giả thuyết

- 👉 **Giả thuyết 1 (Chính)**: Thiếu `await` trong `getPostsPerDay()` là nguyên nhân trực tiếp làm ném lỗi timeout `getPostsPerDay timed out` làm đỏ màn hình Next.js.
- 👉 **Giả thuyết 2**: Việc không bọc `.catch()` độc lập cho `getUserPromise` trong middleware khiến các connection fetch lỗi của Supabase bị unhandled rò rỉ ra console sau khi timeout kết thúc.
- 👉 **Giả thuyết 3**: Việc thiếu `try-catch` / timeout cho `getAccounts()` làm crash trang Accounts.
- 👉 **Giả thuyết 4**: Bọc `Promise.all` không phòng thủ tại client component khiến UI nhạy cảm với bất kỳ lỗi kết nối Supabase đơn lẻ nào.

---

## D4 — Cô lập & Xác minh nguyên nhân gốc

### Điểm lệch đầu tiên quan sát được (Actual vs Expected)
- **Expected**: Khi offline, các service trả về dữ liệu rỗng (fallback) một cách êm đẹp, console chỉ ghi log cảnh báo có kiểm soát, trang load bình thường.
- **Actual**: Gặp lỗi unhandled promise rejection từ `getPostsPerDay` và `AuthRetryableFetchError` từ middleware.

*Kết luận*: Điểm lệch đầu tiên nằm ở chỗ `getPostsPerDay` ném promise rejection không được bắt do thiếu `await`, và middleware không handle lỗi thất bại chậm của `getUserPromise`.

---

## D5 — Thiết kế cách sửa (Đề xuất)

### Hướng sửa chi tiết:

1. **Tại [dashboard.service.ts](file:///d:/Python/SinoMedia/dashboard/lib/services/dashboard.service.ts)**:
   - Sửa hàm `getPostsPerDay()` để thêm `await` trước `withSupabaseTimeout` để try-catch có thể hoạt động đúng.

2. **Tại [crawler.service.ts](file:///d:/Python/SinoMedia/dashboard/lib/services/crawler.service.ts)**:
   - Bọc hàm `getAccounts()` bằng `withSupabaseTimeout` và khối `try-catch` tương tự các service khác, để trả về danh sách rỗng khi Supabase offline.

3. **Tại [middleware.ts](file:///d:/Python/SinoMedia/dashboard/lib/supabase/middleware.ts)**:
   - Cải tiến phát hiện cookie auth hỗ trợ cookie chunked: `c.name.startsWith("sb-") && c.name.includes("auth-token")`.
   - Thêm `.catch(() => null)` cho `getUserPromise` trong middleware để tránh rò rỉ unhandled rejection fetch error sau khi timeout 2 giây kết thúc.

4. **Tại [page.tsx](file:///d:/Python/SinoMedia/dashboard/app/%28main%29/dash/home/page.tsx)**:
   - Chuyển `Promise.all` sang `Promise.allSettled` và gán fallback UI tương ứng để trang Home chịu tải lỗi tốt hơn, đồng thời đổi `console.error` thành `console.warn`.

---

## D6 — Sửa & Verify

### Thay đổi đã thực hiện:
- Đã thực hiện sửa đổi mã nguồn ở cả 4 file theo kế hoạch D5.
- Xác nhận các file bị tác động:
  - `dashboard/app/(main)/dash/home/page.tsx`
  - `dashboard/lib/services/crawler.service.ts`
  - `dashboard/lib/services/dashboard.service.ts`
  - `dashboard/lib/supabase/middleware.ts`

### Kết quả verify:
- [x] Lệnh `npx.cmd tsc --noEmit` hoàn thành không lỗi.
- [x] Lệnh `npm.cmd run lint` hoàn thành không lỗi.
- [x] Lệnh `npm.cmd run build` chạy thành công 100% ra gói tối ưu Next.js.

---

## D7 — Báo cáo & Bài học

### Bài học rút ra:
- **Async Error Handling trong Next.js**: Khi trả về promise từ một hàm có try-catch, bắt buộc phải dùng `return await promise` thay vì `return promise` nếu muốn khối try-catch tại chỗ có hiệu lực.
- **Race Condition & Fetch Timeout**: Khi thực hiện `Promise.race` cho fetch (như `getUser()`), promise fetch gốc vẫn chạy ngầm khi race kết thúc. Do đó, cần `.catch()` trực tiếp trên promise gốc để triệt tiêu unhandled rejection rác ở console.
- **Khả năng tự hồi phục (Resilience)**: Thay vì dùng `Promise.all` dễ bị sập toàn bộ trang khi một thành phần lỗi, dùng `Promise.allSettled` giúp UI hiển thị được tối đa phần thông tin hoạt động bình thường kèm empty fallback.
