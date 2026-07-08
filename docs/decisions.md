# Decision Log — SinoMedia

## 2026-07-01 — Chuẩn hóa & Phân tách biến môi trường
- **Bối cảnh:** `.env` bị lẫn cấu hình Crawler cũ (MySQL, Redis, Proxy...).
- **Quyết định:** Tách riêng `.env` ở root cho Expo Client (`EXPO_PUBLIC_`) và `supabase/.env.local` cho Edge Functions (R2, OpenAI).

## 2026-07-01 — Re-fetch chi tiết Video Douyin
- **Bối cảnh:** API danh sách bài đăng Douyin thiếu một số link media chất lượng cao.
- **Quyết định:** Chỉ re-fetch chi tiết qua `/aweme/v1/web/aweme/detail/` khi item thiếu media cơ bản (`video.play_addr` hoặc `images`).

## 2026-07-02 — Tối ưu hóa Crawler
- **Bối cảnh:** Crawler tốn RAM/Proxy, trùng lặp tài nguyên R2, thiếu validation.
- **Quyết định:** Dùng Playwright chặn ảnh/media/css; check `HeadObjectCommand` ở R2 trước khi upload để loại bỏ trùng lặp; tự viết hàm check schema runtime thay vì dùng Zod.

## 2026-07-02 — Cơ chế Chống chặn Bilibili Crawler trên Windows
- **Bối cảnh:** Bilibili chặn request trên Windows do thiếu spoofing JA3.
- **Quyết định:** Dùng `CloakBrowser` gửi request qua `page.evaluate`, tự động đồng bộ cookie, ưu tiên `BILIBILI_COOKIE` từ env.

## 2026-07-02 — Gỡ bỏ hoàn toàn OpenAI
- **Bối cảnh:** Yêu cầu dọn sạch OpenAI khỏi dự án.
- **Quyết định:** Gỡ bỏ triệt để UI, types, API, Edge Functions, env và tài liệu liên quan đến OpenAI.

## 2026-07-03 — Tối ưu hóa aspect-ratio Creative Card & Trình phát
- **Bối cảnh:** Lưới Creative bị dài (9:16), trình phát chi tiết bị letterbox.
- **Quyết định:**
  - Thumbnail card chuyển sang `aspect-square`, thêm `#t=0.001` vào video url để tự động lấy thumbnail.
  - Video chi tiết tự co giãn (`max-h-[70vh] w-auto h-auto`), ôm sát tỉ lệ video gốc. Phát âm thanh mặc định khi mở chi tiết.
  - Sử dụng video mock từ `assets_test/video/BN/` (ngang/vuông) để test.

## 2026-07-03 — Điều hướng Creative qua Modal sử dụng URL Query Params
- **Bối cảnh:** Chuyển hướng sang `/dash/creative/[id]` làm mất trạng thái filter/scroll ở trang list.
- **Quyết định:**
  - Tách UI chi tiết thành `CreativeDetailView.tsx`.
  - Cập nhật URL dạng `?viewId=CR-XXX` (shallow push, `{ scroll: false }`) để hiển thị modal đè lên mà không reload trang cha, giữ 100% filter/scroll.
  - Trang chi tiết độc lập `/dash/creative/[id]/page.tsx` gọi lại `CreativeDetailView` với `isModal={false}` để tránh trùng lặp code.

## 2026-07-03 — Tối ưu hóa tải dữ liệu (Lazy Loading & Preload)
- **Bối cảnh:** Tránh stream video/detail của 60 items cùng lúc gây quá tải server.
- **Quyết định:** 
  - List ngoài chỉ load thông tin cơ bản; `CreativeDetailView` chỉ mount khi modal mở.
  - Đặt `preload="metadata"` cho video ở danh sách để chỉ lấy tỉ lệ/thumbnail, chỉ stream đầy đủ khi hover hoặc mở detail.

## 2026-07-03 — Schema Task Metadata
- **Bối cảnh:** Cần thêm các config phụ (tags, language, headless...) mà không làm phình bảng task.
- **Quyết định:** Thêm cột `metadata` kiểu JSONB vào `crawler_tasks`. Riêng `crawled_posts` thêm cột mảng `tags text[]` và `language text` để query tốc độ cao.

## 2026-07-06 — Tag Input dạng Chip
- **Bối cảnh:** Nhập tags cho task trong modal.
- **Quyết định:** Thiết kế tag chip, hỗ trợ paste hàng loạt từ clipboard (onPaste) parse theo regex.

## 2026-07-06 — Chiến lược Lưu trữ Dữ liệu Client
- **Bối cảnh:** Token lưu ở localStorage dễ bị XSS, theme bị giật (flicker), proxy list lớn block main thread.
- **Quyết định:**
  - Lưu Auth Token trong HttpOnly Cookie với `@supabase/ssr` (SameSite=Lax chống CSRF).
  - Zustand UI store có versioning/migration, inline script ở head để check theme chống flicker.
  - Dùng IndexedDB (`idb-keyval`) lưu proxy list lớn thay thế localStorage, kèm debounce ghi và try-catch fallback.

## 2026-07-06 — Kiến trúc Data Access Layer: Repository + Service
- **Bối cảnh:** Dashboard có quá nhiều supabase client, api.ts monolith, mock-data fallback lộn xộn.
- **Quyết định:**
  - Áp dụng pattern: Server Component -> Service -> Repository -> Supabase. Repository là lớp duy nhất chạm DB; Service xử lý business/mapping.
  - Triển khai Phase 1: Tạo các service/repo mới song song mà không xóa file cũ để giảm rủi ro.
  - Realtime: Tách riêng `lib/realtime/subscriptions.ts` là nơi duy nhất dùng browser Supabase client.
  - Auth: Chuyển logic login/sign-up lên Server Actions qua `AuthService` để ghi cookie httpOnly an toàn.
