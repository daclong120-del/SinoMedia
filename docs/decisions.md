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

## 2026-07-08 — Kiến trúc Metric Snapshots & Refresh Task
- **Bối cảnh:** Biểu đồ xu hướng và số lượng tương tác trên Dashboard cần độ chính xác thực tế từ dữ liệu lịch sử thay vì giả lập mock.
- **Quyết định:**
  - Thiết kế 2 bảng snapshot lịch sử: `post_metric_snapshots` và `author_metric_snapshots` trong Supabase DB.
  - Xây dựng `MetricCollectorFactory` và `BilibiliMetricCollector` độc lập để refresh chỉ số từ API nền tảng.
  - Tích hợp ghi nhận snapshot khi cào mới (`upsertPost`, `upsertPosts`, `upsertAuthor`), được bảo vệ bởi guard `hasRecognizedMetric(stats)` cho bài viết và kiểm tra độ tin cậy của followers cho tác giả để tránh lưu dữ liệu 0 giả làm sai lệch lịch sử.
  - Trên Frontend, gom nhóm snapshots theo ngày (`latest-per-day`) để tránh double-count, chỉ hiển thị badge "Thực tế" khi có dữ liệu thật.

## 2026-07-08 — Giới hạn cào bình luận & Theo dõi tiến độ Task phụ (Tasks Phase & Comment Limit)
- **Quyết định:**
  - **Giới hạn cào:** Giới hạn vòng lặp cào sub-comments dừng lại ở tối đa 2 trang (khoảng 40 bình luận phụ) cho mỗi root comment.
  - **Timeout từng video:** Bọc việc cào bình luận của từng video trong `Promise.race` với timeout 60 giây. Quá 60s tự động bỏ qua và chuyển sang video tiếp theo.
  - **Tiến độ & Phase:** Lưu thêm trường metadata `phase` (`collecting_posts` / `crawling_comments`) và `comment_progress` (`current`/`target`).
  - **Cải tiến UI:** Đổi nhãn tiến độ từ `(50/50)` thành `Video: 50/50`, hiển thị text nhấp nháy xanh: `Đang cào bình luận X/Y video` ngay dưới Status Badge của task đang chạy.

## 2026-07-09 — Gia cố bảo mật hệ thống (Harden Auth, Task Auth, Video Proxy SSRF)

- **Context:** Hạn chế các rủi ro bypass authentication (Mock Auth) trên môi trường production, thắt chặt phân quyền quản trị task crawler của Dashboard và ngăn ngừa lỗ hổng SSRF trên API proxy video.
- **Options considered:**
  - A: Sử dụng regex / startsWith() để kiểm tra CORS origin của API video proxy.
  - B: Sử dụng so sánh chính xác origin bằng đối tượng `URL` (được chọn vì an toàn trước các cuộc tấn công DNS Rebinding hoặc subdomain spoofing).
- **Decision:**
  - Mock Auth chỉ hoạt động khi `NODE_ENV !== "production"` và đồng thời có cờ `ENABLE_MOCK_AUTH === "true"` được cấu hình cụ thể.
  - Áp dụng Server Action guards (kiểm tra `requireAdmin()`) trên Dashboard cho các API thao tác Task (`createTask`, `createTasksBulk`, `cancelTask`, `retryTask`) và Account (`getAccounts`).
  - Kích hoạt Row Level Security (RLS) trên các bảng `crawler_tasks` và `crawler_logs` trong DB.
  - Sửa đổi các RPC `claim_next_crawler_task` (chỉ cho phép `service_role` và thu hồi quyền `execute` đối với `public`/`anon`/`authenticated`) và `create_crawler_tasks` (chỉ cho phép `service_role`/`admin`).
  - Tích hợp bảo vệ SSRF cho Video Proxy: Validate HTTPS, CDN domains allowlist, phân giải DNS chặn IP private/local, giới hạn content-type & dung lượng tải (100MB), và dùng exact-origin CORS.
- **Trade-off:** Đổi file Middleware bảo vệ Next.js từ `middleware.ts` sang `proxy.ts` để tương thích với deprecation convention của Next.js 16.2.10.
- **Revisit trigger:** Khi Next.js thay đổi quy ước middleware hoặc khi phát sinh nhu cầu phân quyền logs chi tiết (permission-based) thay vì authenticated-wide.

## 2026-07-09 — Log Redaction & Security Hygiene (Cookie, Từ nối tiếng Việt & CSRF Prod)
- **Bối cảnh:** Lộ thông tin vận hành trong logs (cookie nhiều cặp bị hở đuôi sau `;`, msToken bị lộ khi đi kèm câu log tiếng Việt), dev scripts bypass logger thô, và nguy cơ host spoofing trong CSRF.
- **Quyết định:**
  - Thiết kế **3 bộ Regex đặc tả Cookie** (JSON style, value có nháy, và cookie thô không nháy) kết hợp loại trừ khoảng trắng đầu value để mask sạch 100% cookie.
  - Cải tiến Regex token hỗ trợ **từ nối (tiếng Việt/ASCII)** đứng trước token để mask chính xác.
  - Kích hoạt **Generic Token Redactor** cho mọi chuỗi continuous >= 20 ký tự (loại trừ URL/path/email).
  - Chuyển toàn bộ console logs trong `check_status.ts`/`check_tasks.ts` sang Central Logger để tự động làm sạch.
  - Giới hạn **dynamic host trust của CSRF chỉ chạy ở Development** (Production chỉ tin cậy whitelist tĩnh).
  - **API Token Enforcement**: Hoàn thành DB migration, Repo layer và UI Panel. Luồng enforcement ở runtime API routes được đưa vào backlog.

## 2026-07-09 — Siết chặt ranh giới DB Boundary (Tách biệt Query và Mapping/Formatting)

- **Context:** `AccountRepository` trước đây thực hiện truy vấn song song 2 bảng độc lập (`crawler_accounts`, `crawler_proxies`) và tự định dạng chuỗi proxy (`host:port:username:password`) trước khi trả về. Điều này vi phạm nguyên tắc ranh giới kiến trúc (Repository chứa logic nghiệp vụ và tự ý query bảng ngoài scope của nó).
- **Options considered:**
  - A: Giữ nguyên truy vấn song song và định dạng trong Repository để tránh đổi kiểu dữ liệu.
  - B: Sử dụng Supabase relational join (`select("*, crawler_proxies(...)")`) trong Repository, đồng thời chuyển toàn bộ logic định dạng và masking credentials về Service layer (`mapDbAccount`) (Được chọn).
- **Decision:** Thực thi nghiêm ngặt ranh giới: Repository chỉ trả về dữ liệu thô (raw data) của truy vấn (gồm cả join), Service layer chịu trách nhiệm định dạng và mapping dữ liệu cho UI/Domain.
- **Trade-off:** Cần viết kiểu dữ liệu join chi tiết hoặc cast kiểu qua `unknown` để tránh lỗi TypeScript linter do kiểu join tự động của PostgREST.
- **Revisit trigger:** Khi cấu trúc cơ sở dữ liệu thay đổi hoặc quan hệ account-proxy chuyển sang n-n.


