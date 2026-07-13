
# Decision Log — SinoMedia

## 2026-07-13 — Douyin dùng Playwright Persistent Context để Bootstrap Session [initiative: douyin-session-bootstrap]

- **Context:** Douyin HTTP API vẫn có thể gọi trực tiếp, nhưng raw cookie thô không đủ ổn định vì session còn phụ thuộc browser context/localStorage/fingerprint như `xmst/msToken`, `webid`, `verifyFp/fp`, `uifid`, `navigator.userAgent`, viewport và language/platform. Việc bắt người vận hành tự gom các token này thủ công làm quy trình dễ sai và không phù hợp vận hành worker.
- **Options considered:**
  - A: Giữ mô hình cookie-only, yêu cầu account data phải chứa đủ `msToken`, `webid`, `fp`, `uifid` trước khi worker chạy.
  - B: Thêm bước Playwright Chromium persistent context làm session hydrator: nạp raw cookie hoặc login, mở `douyin.com`, đọc cookies/localStorage/navigator, xuất enriched `DouyinSession`, chạy diagnostic, rồi chuyển lại HTTP API crawler. (Được chọn).
- **Decision:** Chọn B cho Douyin. Browser được phép tồn tại trong backend/worker như bước bootstrap hoặc refresh session, không phải runtime crawl chính. `runSessionDiagnostic` vẫn là hard gate trước khi search/detail/comment. Raw cookie Douyin chỉ là input bootstrap, không được coi là session hoàn chỉnh.
- **Trade-off:** Worker/VPS chạy Douyin cần môi trường chạy Playwright Chromium và persistent profile. Chi phí RAM/ops tăng ở bước bootstrap, nhưng crawl chính vẫn giữ HTTP API để nhẹ hơn browser crawling toàn phần.
- **Evidence:** So sánh với `D:\Python\ChinaMediaCrawler\_mediaCrawler` cho thấy họ launch browser context, kiểm tra `window.localStorage.HasUserLogin`, lấy cookie từ `browser_context.cookies()` và lấy `xmst` từ localStorage trước khi HTTP client gọi API. Trong SinoMedia, diagnostic/checkpoint đã chứng minh session cookie-only chưa đủ để coi là hoạt động thật.
- **Revisit trigger:** Khi Douyin HTTP-only có thể pass diagnostic ổn định bằng session capture không cần browser runtime, hoặc khi Playwright bootstrap không còn pass do thay đổi cơ chế platform.

## 2026-07-13 — Không thay Douyin HTTP API crawler bằng Firecrawl [initiative: douyin-http-first]

- **Context:** Khi Douyin search tiếp tục fail vì session chưa được API chấp nhận (`status_code = 2483`, "请先登录"), có đề xuất dùng repo Firecrawl tại `D:\Python\firecrawl` như phương án thay thế. Firecrawl self-host là crawler web tổng quát, có API scrape/search/crawl/interact và service Playwright riêng, phù hợp với web/docs public hơn là platform adapter có signed HTTP API như Douyin.
- **Options considered:**
  - A: Thay core Douyin search/detail/comment bằng Firecrawl page crawler hoặc Firecrawl Agent.
  - B: Giữ Douyin là HTTP API adapter riêng; Firecrawl chỉ là sidecar tùy chọn cho generic web/docs crawl hoặc diagnostic ngoài hot path. (Được chọn).
- **Decision:** Chọn B. Douyin crawler tiếp tục đi theo hướng `DouyinSession -> signed HTTP request -> normalized storage`. Browser/Playwright nếu có chỉ được dùng ở tầng session bootstrap/diagnostic để hydrate cookie thô thành session đầy đủ; Firecrawl không được thay thế `crawler-pipeline/src/crawl/douyin` làm runtime search/detail/comment.
- **Trade-off:** Không tận dụng được abstraction scrape/crawl tổng quát của Firecrawl cho Douyin, nhưng giữ dữ liệu có cấu trúc, kiểm soát signing/session/account pool tốt hơn và tránh kéo thêm Redis/RabbitMQ/Postgres/Playwright service vào hot path.
- **Revisit trigger:** Chỉ xem xét lại khi Douyin đóng hoàn toàn signed HTTP API nhưng rendered web page public vẫn trả đủ dữ liệu có cấu trúc, hoặc khi SinoMedia cần một module crawl web public không phụ thuộc platform API.

## 2026-07-10 — Nâng cấp Cơ sở dữ liệu Content-Aware & zvideo media check [initiative: Content-Aware Schema]

- **Context:** Trước đây hệ thống phát triển xoay quanh các platform video-centric (Bilibili, Douyin, XHS), giả định mọi bài đăng tốt đều phải có media (ảnh/video/cover). Điều này dẫn tới việc cào zhihu text-only posts bị hiểu lầm là lỗi media (media_status = 'unavailable'). Tiêu đề bài viết zhihu bị cắt thô từ caption và thiếu canonical link nguồn (`source_url`) cho người dùng.
- **Options considered:**
  - A: Sửa đổi logic UI của Dashboard tự phán đoán content text-only dựa trên platform = zhihu và media trống (Không được chọn vì sẽ làm phình to code UI, khó mở rộng khi thêm Weibo/Tieba).
  - B: Nâng cấp contract của cơ sở dữ liệu (`crawled_posts`), tách biệt rõ ranh giới giữa `media_type` (video/image/carousel/text) và `content_type` (answer/article/zvideo/note/video), bổ sung cột `title` và `source_url` canonical (Được chọn vì dữ liệu chuẩn hóa từ gốc).
- **Decision:**
  1. Thêm các cột `title`, `content_type`, `source_url` vào bảng `crawled_posts`.
  2. Nới lỏng check constraint cho phép `media_type = 'text'` và `media_status = 'not_applicable'`.
  3. Cập nhật API Whitelist của Worker API Guard cho phép truyền 3 trường mới qua Next.js Server.
  4. Sửa đổi `supabase_writer.ts` để map đầy đủ các trường mới này vào Database.
  5. Cập nhật Typescript Generated Types cho Dashboard và Crawler pipeline.
  6. Sửa đổi Zhihu Crawler: Lấy tiêu đề chính thức của bài viết/câu hỏi; Sinh URL chính tắc canonical; Gán `media_type = 'text'` và `media_status = 'not_applicable'` khi không có media.
  7. Đối với `zvideo`, nếu thiếu cả cover URL lẫn playlist thực tế (do lỗi/chặn), tự động chuyển sang `media_status = 'unavailable'`.
  8. Thực thi script SQL Backfill toàn diện cho Zhihu answer cũ (lấy title từ `raw->'question'->>'title'`, sinh source_url) và cập nhật 193 bài đăng Bilibili, Douyin, XHS lịch sử.
- **Trade-off:** UI Dashboard và các services khác cần điều chỉnh để hiển thị badge/nút nguồn canonical theo contract mới này.
- **Revisit trigger:** Khi tích hợp các platform tin tức hoặc Weibo cào text-only diện rộng.

## Decision: API Token Runtime Enforcement (2026-07-09)
- **Context**: We need to secure the worker's access to the database. Previously, workers used the `SUPABASE_SERVICE_ROLE_KEY` to directly call PostgREST APIs, bypassing RLS and gaining full access.
- **Decision**: 
  1. Implement a unified `Token Guard` in Next.js (`dashboard/lib/guards/token.guard.ts`) that validates raw tokens via SHA-256 hash against the `api_tokens` table.
  2. Verify token active status, expiration, and required scopes.
  3. Set up a Next.js proxy route (`/api/worker/rest/v1/[...path]`) that intercepts the worker's PostgREST requests, validates the token, and uses the Service Role key to forward the request to Supabase.
  4. **Hardening**:
     - **Deny-by-Default**: Allowlist exactly 13 endpoints/methods. Reject anything else with `403`.
     - **Disable Wildcard `*`**: The proxy strictly rejects wildcard tokens (`*`). Granular specific scopes are mandatory for worker requests.
     - **Strict PATCH Constraints**: All `PATCH` updates require an `id` query parameter formatted as `eq.<uuid>`. The request body is validated against a whitelist per table (`crawler_tasks`, `crawler_accounts`, `crawled_posts`, `crawled_authors`), rejecting any unknown properties with `400`.
     - **Mandatory ENV**: The crawler worker must declare `INTERNAL_API_URL` and `API_TOKEN` in `.env`, causing a loud startup crash if either is missing.
- **Consequences**: Workers no longer hold the Service Role key. They only need an `API_TOKEN`. Next.js API acts as the single security gateway (Token Guard) for all internal API access, ensuring auditability (`last_used_at`), granular scope-based authorization, and preventing mass updates.

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
- **Quyết định:** [SUPERSEDED by 2026-07-10 ADR] Trước đây dùng `CloakBrowser` gửi request qua `page.evaluate`. Hiện đã thay thế hoàn toàn bằng mô hình HTTP-only.

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

## 2026-07-09 — Khóa quyền truy cập anon và thắt chặt phân quyền trên Supabase
- **Bối cảnh:** Lộ mã `anon` key trên client browser cho phép bất kỳ ai bypass RLS của các bảng dữ liệu cào hoặc RPC của worker. Hơn nữa, việc migrations trước đó thiếu `DROP POLICY IF EXISTS` dẫn đến lỗi khi re-apply. Script test cũ sử dụng tài khoản hardcoded gây rủi ro trên prod. Các bảng vận hành như `crawler_tasks` và `crawler_logs` vô tình cho phép `authenticated` chung truy cập.
- **Quyết định:**
  - Thu hồi toàn bộ default privileges và existing privileges trên mọi bảng/function của schema `public` khỏi vai trò `anon` và `public`.
  - Enforce Row Level Security (RLS) cho toàn bộ bảng dữ liệu. Các bảng chứa dữ liệu cá nhân như `exported_files` được scope nghiêm ngặt theo `created_by = auth.uid()`.
  - Các bảng vận hành nhạy cảm (`crawler_tasks`, `crawler_logs`, `audit_logs`, `api_tokens`, `crawler_accounts`) bắt buộc phải bọc RLS Admin-only (`public.is_admin(auth.uid())`).
  - Đi kèm với RLS, các route tương ứng trên Dashboard (`/dash/tasks`, `/dash/accounts`) cũng phải được cấu hình chặn bằng Next.js Middleware (`proxy.ts`).
  - Thêm `DROP POLICY IF EXISTS` cho tất cả các migration liên quan đến Policy để đảm bảo tính idempotent.
  - Loại bỏ hoàn toàn hardcoded credentials và auto-signup trong các E2E test scripts (sử dụng ENV vars). Xóa các file JS scratch nhạy cảm ở gốc dự án.
  - Thu hồi quyền thực thi functions/RPCs từ vai trò `public` và chỉ cấp lại một cách có chọn lọc cho `service_role` và `authenticated` (vd: `claim_next_crawler_task` chỉ cho phép `service_role`).
- **Thành quả kiểm chứng:** Toàn bộ E2E API tests xuyên tầng DB/API mô phỏng truy vấn thô bằng `anon` key thất bại (HTTP 401/403, code 42501). Test scripts mới xác nhận role `user` bị chặn hoàn toàn (HTTP 200 trả mảng rỗng `[]`) đối với các bảng cấu hình/vận hành, trong khi các API của Dashboard (admin) và Worker (service_role) hoạt động bình thường.

## 2026-07-09 — Triển khai Guard Snapshot chống Metric Lịch Sử "Giả"
- **Bối cảnh:** Việc chuẩn hóa (normalize stats) các post/author không chứa metrics về dạng mặc định `0` làm phát sinh các bản ghi snapshot metric lịch sử sai lệch khi cào/refresh dữ liệu.
- **Quyết định:**
  - Phát triển helper logic `hasPostMetricInput(stats)` và `hasAuthorMetricInput(author)` để phát hiện sự hiện diện thực tế của dữ liệu thô (likes, views, followers...).
  - Chỉ cho phép insert snapshot vào `post_metric_snapshots` và `author_metric_snapshots` khi vượt qua được guard của hai hàm helper này.
  - Sửa đổi Bilibili metric collector để lưu trữ trực tiếp phản hồi `relationRes` nguyên bản thay vì fallback object rỗng để lưu vết đầy đủ.

## 2026-07-09 — Chuyển đổi chiến lược Desktop App (Desktop Runtime Package)
- **Bối cảnh:** Bản build Pake cũ chỉ wrap `localhost:3000`, đòi hỏi người dùng tự khởi chạy dashboard và các service môi trường.
- **Quyết định:**
  - Hủy bỏ hướng đi Pake bọc `localhost` thô sơ.
  - Chuyển `desktop-app/` thành **Packaging Workspace** thực thụ.
  - Xây dựng **SinoMedia Desktop Runtime Package** có khả năng tự bundle dashboard, worker, và embedded runtime (Node/Electron/Tauri) thành một khối độc lập (không cần cài Node/Rust).
  - Khởi tạo trước các `MODULE_EXTRACTION_CONTRACT.md` và `BUILD_ARTIFACT_CONTRACT.md` làm tiêu chuẩn cho các build script tiếp theo.

## 2026-07-09 — Hiện thực hóa Scaffold & Full Build cho Desktop Runtime Package
- **Bối cảnh:** Cần triển khai các script build tự động để tạo ra Desktop Runtime Package hoàn chỉnh theo contract đã ký kết.
- **Quyết định:**
  1. Phát triển script build idempotent `build-runtime-package.ps1` hỗ trợ chế độ `Scaffold` và `Full`.
  2. Phát triển script `health-check.ps1` hỗ trợ static checks và dynamic `Smoke Test` (`-Smoke`).
  3. Các script launcher loại bỏ việc truy vấn env của PowerShell và không thực hiện clone env để tránh lỗi trùng lặp key `Path`/`PATH`.
  4. Khởi chạy trực tiếp `$NodeExe` bằng `$Process.Start()` của .NET `System.Diagnostics.Process` để thu thập chính xác PID.
  5. Sửa đổi smoke test để verify sự tồn tại của file PID trước khi kiểm tra port nhằm tránh false positive.

## 2026-07-09 — Thắt chặt API Proxy & Kiểm thử Bảo mật nâng cao [initiative: Security Hardening]
- **Bối cảnh:** Cần củng cố an toàn tuyệt đối cho API `GET crawler_accounts` (nơi chứa các cookie dữ liệu cào nhạy cảm) để tránh rò rỉ cookie ngoài ý muốn và đảm bảo có kiểm thử hồi quy vững vàng.
- **Quyết định:**
  1. Thiết lập hàm `validateCrawlerAccountGet(searchParams)` phân tách rõ rệt 2 Mode cho GET `crawler_accounts`.
  2. Chặn các query phức tạp hoặc select cột sai phạm vi cho phép bằng `400 Bad Request`.
  3. Cưỡng chế ghi đè các tham số URL query params trước khi forward tới Supabase REST.
  4. Mở rộng script regression test lên 27/27 test cases (RLS + Proxy) và bắt buộc login tài khoản kiểm thử thành công (fail-closed thay vì skip).
- **Hậu quả:** Bảo vệ tuyệt đối Cookie của tài khoản cào ở backend trước các yêu cầu query rộng.
- **Kích hoạt xem xét lại:** Khi có cơ chế token mới hoặc cần mở rộng các fields của crawler_accounts cho worker.

## 2026-07-09 — Thống nhất Lộ trình Desktop App & Nguyên tắc Portable-First
- **Bối cảnh:** Cần xác định rõ ranh giới và thứ tự ưu tiên cho việc phát triển Desktop App.
- **Quyết định:**
  1. **Nguyên tắc Portable-First**: Ưu tiên "chạy độc lập thật" (Po- **Evidence:** `tsc --noEmit` pass, `npm run build` pass, build output xác nhận không còn `/api/creative/*`.
- **Revisit trigger:** Cần public API cho creative data, hoặc cần thêm HTTP methods cho worker API.

## 2026-07-10 — Phòng chống Brute-force Đăng nhập bằng Turnstile Invisible & Hardening Rate Limit [initiative: Security Hardening]
- **Context:** Đánh giá bảo mật phát hiện hệ thống không có rate limiting ở application layer, dẫn đến nguy cơ brute-force mật khẩu và lạm dụng API qua các auth server actions.
- **Options considered:**
  - A: Triển khai rate limiting ở Next.js Middleware hoặc dùng thư viện bên ngoài (Upstash).
  - B: Tích hợp Cloudflare Turnstile Invisible Captcha và siết chặt cấu hình Supabase auth rate limit/password policy (Được chọn vì chi phí UX bằng 0 và tích hợp native với Supabase Auth).
- **Decision:**
  1. Siết cấu hình auth trong [config.toml](file:///d:/Python/SinoMedia/supabase/config.toml): tăng chiều dài mật khẩu tối thiểu lên 8 ký tự, bật yêu cầu có chữ và số (`letters_digits`), giảm giới hạn login/signup mỗi IP từ 30 xuống 10 lần trong 5 phút.
  2. Tích hợp `@marsidev/react-turnstile` để kích hoạt Turnstile Invisible Captcha chạy ẩn ở background cho cả [login-form.tsx](file:///d:/Python/SinoMedia/dashboard/app/(auth)/login/login-form.tsx) và [sign-up-form.tsx](file:///d:/Python/SinoMedia/dashboard/app/(auth)/sign-up/sign-up-form.tsx).
  3. Cập nhật `AuthService`, `loginAction` và `signUpAction` để truyền `captchaToken` vào Supabase options khi xác thực.
- **Trade-off:** Cần cấu hình `NEXT_PUBLIC_TURNSTILE_SITE_KEY` và `[auth.captcha]` (Turnstile secret) cho Supabase ở môi trường dev nếu muốn kiểm thử captcha cục bộ.
- **Revisit trigger:** Khi Cloudflare Turnstile thay đổi API hoặc Supabase thay đổi cách handle captcha verification.

## 2026-07-10 — Loại bỏ CloakBrowser & Chuyển sang Kiến trúc HTTP-First [initiative: deprecate-browser-interactive]
- **Context:** `CloakBrowser` là một dependency trình duyệt tương tác nặng nề, chỉ chạy được ở môi trường local và gây phức tạp cho Docker/Production. Nó được dùng cho cơ chế đăng nhập thủ công/QR dự phòng.
- **Options considered:**
  - A: Cập nhật `CloakBrowser` và duy trì luồng login tương tác.
  - B: Loại bỏ hoàn toàn `CloakBrowser` và chuyển hợp đồng crawler sang "HTTP-first, fail-fast nếu không có session/cookie hợp lệ". (Được chọn).
- **Decision:** Chọn B. Gỡ bỏ `cloakbrowser` khỏi `package.json`, xóa các file `login.ts` và `browser_sign.ts` liên quan đến login tương tác. Cập nhật `ensureLogin` của 6 platform để quăng lỗi báo hết hạn session/cookie thay vì khởi tạo trình duyệt.
- **Trade-off:** Các platform chưa có HTTP-only parity (XHS, Weibo, Tieba, Kuaishou) sẽ không thể cào nếu không được nạp sẵn cookie hợp lệ từ trước.
- **Evidence:** `npx tsc --noEmit` pass, dependencies sạch bóng `cloakbrowser`.
- **Revisit trigger:** Khi có nhu cầu phát triển công cụ tự động hóa cấp credential mới từ dashboard.��n thông tin đã che dấu (sanitized props).
  4. Server Action `saveSettingsAction` áp dụng đầy đủ guards và ghi log audit event không lưu thô.
- **Hậu quả:** Bảo vệ tuyệt đối secrets ở cả REST API, database và audit logs.

## 2026-07-09 — Security Hardening: Xóa Creative API Routes, Auth Guard Server Actions, Security Headers [initiative: security-audit]
- **Context:** Đánh giá bảo mật phát hiện 7 creative API routes (`/api/creative/*`) hoàn toàn không có auth guard — middleware chỉ match `/dash/*` nên `/api/*` bị bypass. 3 server action files re-export trần từ service mà không kiểm tra auth. Dashboard thiếu security headers. Worker API export PUT/DELETE/OPTIONS không cần thiết.
- **Options considered:**
  - A: Thêm auth guard vào từng creative API route (giữ routes)
  - B: Xóa luôn creative API routes (đã deprecated, 0 consumer) + auth guard actions
- **Decision:** Chọn B. Xóa toàn bộ `app/api/creative/` (7 routes). Wrap tất cả server actions với `requireUser()`. Thêm 5 security headers vào `next.config.ts`. Xóa 3 unused HTTP handlers (PUT/DELETE/OPTIONS) khỏi worker API.
- **Trade-off:** Nếu tương lai cần public API cho creative data, phải tạo route mới có auth. Hiện tại giảm attack surface 70%.
- **Evidence:** `tsc --noEmit` pass, `npm run build` pass, build output xác nhận không còn `/api/creative/*`.
- **Revisit trigger:** Cần public API cho creative data, hoặc cần thêm HTTP methods cho worker API.

## 2026-07-09 — Phòng chống Brute-force Đăng nhập bằng Turnstile Invisible & Hardening Rate Limit [initiative: Security Hardening]
- **Context:** Đánh giá bảo mật phát hiện hệ thống không có rate limiting ở application layer, dẫn đến nguy cơ brute-force mật khẩu và lạm dụng API qua các auth server actions.
- **Options considered:**
  - A: Triển khai rate limiting ở Next.js Middleware hoặc dùng thư viện bên ngoài (Upstash).
  - B: Tích hợp Cloudflare Turnstile Invisible Captcha và siết chặt cấu hình Supabase auth rate limit/password policy (Được chọn vì chi phí UX bằng 0 và tích hợp native với Supabase Auth).
- **Decision:**
  1. Siết cấu hình auth trong [config.toml](file:///d:/Python/SinoMedia/supabase/config.toml): tăng chiều dài mật khẩu tối thiểu lên 8 ký tự, bật yêu cầu có chữ và số (`letters_digits`), giảm giới hạn login/signup mỗi IP từ 30 xuống 10 lần trong 5 phút.
  2. Tích hợp `@marsidev/react-turnstile` để kích hoạt Turnstile Invisible Captcha chạy ẩn ở background cho cả [login-form.tsx](file:///d:/Python/SinoMedia/dashboard/app/(auth)/login/login-form.tsx) và [sign-up-form.tsx](file:///d:/Python/SinoMedia/dashboard/app/(auth)/sign-up/sign-up-form.tsx).
  3. Cập nhật `AuthService`, `loginAction` và `signUpAction` để truyền `captchaToken` vào Supabase options khi xác thực.
- **Trade-off:** Cần cấu hình `NEXT_PUBLIC_TURNSTILE_SITE_KEY` và `[auth.captcha]` (Turnstile secret) cho Supabase ở môi trường dev nếu muốn kiểm thử captcha cục bộ.
- **Revisit trigger:** Khi Cloudflare Turnstile thay đổi API hoặc Supabase thay đổi cách handle captcha verification.


