# Debug Log — Sửa lỗi luồng Creative Media sau Refactor

Initiative: `debug-creative-media-findings`
Trạng thái: ✅ xong
Tiến độ: Đã sửa và verify hoàn tất cả 6 lỗi.

## 📍 Đang làm
Đã hoàn thành toàn bộ các công việc debug và validation check.

## Triệu chứng & Nguyên nhân

1. **Lỗi 1 (P1): Thiếu R2_PUBLIC_URL trong dashboard/.env.local**
   - *Triệu chứng:* Khi crawler trả về relative R2 path, dashboard sẽ render relative URL `/bilibili/...` và báo lỗi 404 do thiếu base URL.
   - *Nguyên nhân:* File `dashboard/.env.local` chưa có cấu hình `R2_PUBLIC_URL` hoặc `NEXT_PUBLIC_R2_PUBLIC_URL`.
   - *Cách sửa:* Đã thêm `NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-61ef6f7c6215df3616424def03fa7070.r2.dev` vào file `dashboard/.env.local`. Cập nhật `resolveMediaUrl()` in console.error cảnh báo lỗi rõ và return rỗng để bảo vệ player nếu thiếu base URL.

2. **Lỗi 2 (P1): Trạng thái cached/r2 bị set trước khi upload thành công**
   - *Triệu chứng:* Bản ghi vẫn hiển thị `cached/r2` ngay cả khi không upload được media lên R2 (ví dụ: không có original URL hoặc upload lỗi).
   - *Nguyên nhân:* Crawler (zhihu, douyin, v.v.) khởi tạo `mediaSource = 'r2'` và `mediaStatus = 'cached'` trước khi tiến hành loop upload và không update lại đúng nếu không có media nào được upload thực sự.
   - *Cách sửa:* Đã refactor logic đánh giá trạng thái trong 6 crawler platform core files (`douyin`, `bilibili`, `xhs`, `kuaishou`, `weibo`, `zhihu`) để đếm số upload thực tế. Nếu không có file nào được upload thành công -> chuyển thành `none/unavailable` hoặc `original/failed` tương ứng. Nếu upload đầy đủ -> `r2/cached`. Nếu upload một phần -> `mixed/cached`.

3. **Lỗi 3 (P2): Warning cho video bị lỗi/hết hạn không hiển thị**
   - *Triệu chứng:* Video bị lỗi/hết hạn (failed/expired) vẫn cố render dead player mà không hiện warning banner.
   - *Nguyên nhân:* Trong `CreativeDetailView.tsx`, warning banner chỉ được đặt trong image branch. Trong `CreativeCard.tsx`, chỉ chặn `failed` chứ không chặn `expired`.
   - *Cách sửa:* Đưa warning banner ra ngoài cả video và image branches trong `CreativeDetailView.tsx`. Cập nhật `CreativeCard.tsx` để chặn cả `expired` và `unavailable` khi render video preview/thumbnail.

4. **Lỗi 4 (P2): Migration phân loại sai R2 keys**
   - *Triệu chứng:* Các cached posts cũ bị phân loại nhầm thành `original_only`.
   - *Nguyên nhân:* Migration SQL sử dụng `LIKE '%r2%'` để check R2 URL, nhưng R2 keys thực tế được lưu dạng `douyin/id/video.mp4` (không chứa chữ "r2").
   - *Cách sửa:* Đã cập nhật rule check trong migration thành `media_urls[1] !~* '^https?://'` để nhận diện relative R2 keys. Chạy reset database local thành công.

5. **Lỗi 5 (P3): File .agents/workflows bị xóa nhầm**
   - *Triệu chứng:* Git diff báo mất file `designer.md` và `tester.md`.
   - *Cách sửa:* Đã khôi phục hoàn chỉnh các file này qua git restore.

6. **Lỗi 6 (P3): Lỗi trailing whitespace**
   - *Triệu chứng:* `git diff --check` báo lỗi trailing whitespace ở một số files.
   - *Cách sửa:* Đã xóa sạch các khoảng trắng thừa ở cuối dòng, lệnh `git diff --check` báo pass hoàn toàn.

## Kết quả Verify
- Database local reset & migrate thành công.
- Typecheck (`tsc --noEmit`) của cả `dashboard` và `crawler-pipeline` đều pass 100%.
- Eslint `dashboard` pass 100%.
- `git diff --check` pass 100%.
