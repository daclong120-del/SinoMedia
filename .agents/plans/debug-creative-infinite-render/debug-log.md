# Nhật ký Debug — Sửa lỗi lặp re-render vô hạn trên trang Growth và New

Ngày bắt đầu: 2026-07-07  
Initiative: `debug-creative-infinite-render`  
Trạng thái: ✅ xong

---

## D1 — Triệu chứng & Tái hiện

### Triệu chứng
Tại các trang:
- `/dash/creative/growth`
- `/dash/creative/new`
Góc dưới bên trái màn hình hiển thị trạng thái `Rendering...` nhấp nháy liên tục. Trình duyệt liên tục thực hiện push state khiến hiệu năng bị giảm sút.

### Bước tái hiện
1. Mở trang `/dash/creative/growth?sortBy=growth_pct_desc` hoặc `/dash/creative/new?page=1&limit=60`.
2. Quan sát log rendering hoặc UI góc dưới bên trái.

---

## D2 — Thu thập bằng chứng

1. **Vòng lặp re-render trong `growth-client.tsx`**:
   - Tại [growth-client.tsx](file:///d:/Python/SinoMedia/dashboard/app/(main)/dash/creative/growth/growth-client.tsx#L50-L68):
     ```typescript
     useEffect(() => {
       ...
       const currentViewId = searchParams.get("viewId");
       if (currentViewId) params.set("viewId", currentViewId);

       startTransition(() => {
         router.push(`?${params.toString()}`, { scroll: false });
       });
     }, [selectedPlatform, sortBy, router, searchParams]);
     ```
     *Bằng chứng*: `useEffect` phụ thuộc vào `searchParams` và thực thi `router.push()`. Mỗi khi push, `searchParams` thay đổi tham chiếu, kích hoạt `useEffect` chạy lại tạo thành vòng lặp vô hạn.

2. **Vòng lặp tương tự trong `new-client.tsx`**:
   - Tại [new-client.tsx](file:///d:/Python/SinoMedia/dashboard/app/(main)/dash/creative/new/new-client.tsx#L58-L77):
     ```typescript
     useEffect(() => {
       ...
       startTransition(() => {
         router.push(`?${params.toString()}`, { scroll: false });
       });
     }, [selectedPlatform, currentPage, pageSize, router, searchParams]);
     ```
     *Bằng chứng*: Lỗi tương tự xảy ra do phụ thuộc trực tiếp vào đối tượng `searchParams`.

---

## D3 — Đưa giả thuyết

- 👉 **Giả thuyết**: Cần tránh phụ thuộc trực tiếp vào đối tượng `searchParams` trong dependency array của `useEffect`. Thay vào đó, chuyển thành phụ thuộc vào chuỗi primitive `currentQueryString = searchParams.toString()`. Đồng thời, chỉ thực hiện `router.push()` khi và chỉ khi chuỗi truy vấn mới thực sự khác chuỗi hiện tại (`nextQueryString !== currentQueryString`).

---

## D4 — Cô lập & Xác minh nguyên nhân gốc

- *Kết luận*: Đúng là `router.push()` làm URL/searchParams thay đổi, dẫn đến thay đổi dependency và re-run effect liên tục. Điểm lệch đầu tiên là việc push không có cơ chế chặn (guard) khi tham số URL không thay đổi giá trị.

---

## D5 — Thiết kế cách sửa (Đề xuất)

1. Lấy `currentQueryString = searchParams.toString()` bên ngoài `useEffect`.
2. Trong `useEffect`, kiểm tra:
   ```typescript
   const nextQueryString = params.toString();
   if (nextQueryString === currentQueryString) {
     return;
   }
   ```
3. Thay thế dependency `searchParams` bằng `currentQueryString` trong danh sách phụ thuộc.
4. Áp dụng cho cả [growth-client.tsx](file:///d:/Python/SinoMedia/dashboard/app/(main)/dash/creative/growth/growth-client.tsx) và [new-client.tsx](file:///d:/Python/SinoMedia/dashboard/app/(main)/dash/creative/new/new-client.tsx).

---

## D6 — Sửa & Verify

### Thay đổi đã thực hiện:
- Đã sửa đổi `growth-client.tsx` và `new-client.tsx` sử dụng cơ chế so sánh chuỗi truy vấn `nextQueryString === currentQueryString` làm chốt chặn (guard) để tránh push URL trùng lặp.
- Thay thế dependency `searchParams` bằng `currentQueryString`.

### Kết quả verify:
- [x] Lệnh `npx.cmd tsc --noEmit` hoàn thành không lỗi.
- [x] Lệnh `npm.cmd run lint` hoàn thành không lỗi.

---

## D7 — Báo cáo & Bài học

### Bài học rút ra:
- **Tránh Infinite Loops trong Next.js Client Component**: Khi đồng bộ state local lên URL bằng `router.push()`, nếu `useEffect` phụ thuộc vào `searchParams` thì bắt buộc phải chuyển sang phụ thuộc vào chuỗi primitive (`searchParams.toString()`) và thêm guard check chặn push khi URL không thực sự thay đổi. Điều này giúp loại bỏ triệt để các vòng lặp re-render lãng phí tài nguyên hệ thống.
