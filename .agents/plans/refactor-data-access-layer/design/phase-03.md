# Phase 3 Design — API Route Standardization & Codebase Cleanup

## Mục tiêu
1. Chuẩn hóa 7 API routes trong `dashboard/app/api/creative/*` để sử dụng trực tiếp các phương thức tương ứng của `creative.service.ts` (Service Layer).
2. Loại bỏ hoàn toàn mock data fallback và các khối try-catch che giấu lỗi trong các API routes.
3. Gỡ bỏ (xoá) các file legacy không còn sử dụng:
   - `dashboard/lib/api.ts` (Legacy Monolith DAL)
   - `dashboard/lib/mock-data.ts` (Legacy Mock Data)
   - `dashboard/lib/supabase.ts` (Legacy Client Singleton nếu không còn ai import)
4. Thiết lập CLI seed `npm run db:seed` nếu có.

## Chi tiết các API Routes Refactor

### 1. `/api/creative/search/route.ts`
- **Mục đích**: Tìm kiếm bài viết (creative ads) kèm bộ lọc.
- **Service sử dụng**: `searchAds` từ `creative.service.ts`.
- **Cải tiến**:
  - Không tự viết logic query Supabase.
  - Không fallback về mock data.
  - Parse query params đầu vào và gọi `searchAds` trực tiếp.

### 2. `/api/creative/new/route.ts`
- **Mục đích**: Lấy danh sách creative ads mới nhất.
- **Service sử dụng**: `getNew` từ `creative.service.ts`.

### 3. `/api/creative/growth/route.ts`
- **Mục đích**: Lấy danh sách creative ads tăng trưởng.
- **Service sử dụng**: `getGrowth` từ `creative.service.ts`.

### 4. `/api/creative/trending/route.ts`
- **Mục đích**: Lấy danh sách creative ads đang thịnh hành.
- **Service sử dụng**: `getTrending` từ `creative.service.ts`.

### 5. `/api/creative/[id]/route.ts`
- **Mục đích**: Chi tiết một bài viết (creative ad) theo ID.
- **Service sử dụng**: `getAdById` từ `creative.service.ts`.

### 6. `/api/creative/advertisers/route.ts`
- **Mục đích**: Lấy danh sách nhà quảng cáo (KOL/author).
- **Service sử dụng**: `getAdvertisers` từ `creative.service.ts`.

### 7. `/api/creative/advertisers/[id]/route.ts`
- **Mục đích**: Chi tiết một nhà quảng cáo kèm danh sách bài viết.
- **Service sử dụng**: `getAdvertiserById` từ `creative.service.ts`.

---

## Nguyên tắc viết code (Phase 3)
- **Cấm dùng try-catch** nuốt lỗi hoặc che giấu lỗi.
- Đảm bảo trả về mã trạng thái HTTP thích hợp (ví dụ: `404 Not Found` khi không tìm thấy thực thể, `500 Internal Server Error` khi lỗi database thực tế, và `200 OK` khi thành công).
- Không được đẻ thêm file cấu hình hay service mới không cần thiết.
