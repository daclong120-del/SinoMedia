# Agent Handbook

Cập nhật lần cuối: 2026-07-13
Mục đích: hướng dẫn ngắn cho AI agent làm việc trong SinoMedia mà không phá hướng hiện tại.

## Read first

Trước khi sửa code hoặc docs, đọc theo thứ tự:

1. `.agents/rules/docs.md`
2. `docs/README.md`
3. `docs/project-status.md`
4. `docs/architecture/architecture.md`
5. `docs/roadmap.md`
6. `docs/decisions.md`

Sau khi đọc, báo với user là đã đọc docs.

## GitNexus rules

Project này dùng GitNexus.

- Trước khi sửa function/class/method/symbol, bắt buộc chạy impact analysis upstream cho symbol đó.
- Nếu impact trả HIGH hoặc CRITICAL, cảnh báo user trước khi sửa.
- Trước khi commit, chạy `detect_changes()` để kiểm tra phạm vi ảnh hưởng.
- Khi cần hiểu code, ưu tiên GitNexus `query()`/`context()` trước, rồi mới đọc file.
- Nếu index stale, đọc file thật để xác minh; không kết luận chỉ từ index.

Docs-only edits không sửa code symbol, nhưng vẫn nên chạy `detect_changes()` trước commit nếu có commit.

## Current architecture boundaries

- Dashboard là control plane, không phải crawler runtime.
- `crawler-pipeline` là worker độc lập.
- Supabase là control plane/data store. External embed/original URL là media path mặc định khi platform hỗ trợ; Cloudflare R2 chỉ là object store tùy chọn cho archive/cache.
- Dashboard read path chuẩn: Server Component -> Service -> Repository -> `createClientServer()` -> Supabase.
- Repository chỉ chịu trách nhiệm truy vấn database và trả về dữ liệu thô (raw data, có join qua PostgREST nếu cần). Tuyệt đối không chứa logic nghiệp vụ, định dạng hiển thị hoặc mapping domain (ví dụ: gộp credentials proxy). Toàn bộ logic mapping và định dạng phải nằm ở Service layer.
- Browser Supabase client chỉ dùng cho realtime subscription.
- API route chỉ dùng cho mutation, webhook, export/download/proxy hoặc compatibility.
- UI không đọc raw platform tables trực tiếp; dùng normalized tables.

## Worker direction

- Worker claim task qua Supabase RPC.
- Worker ghi logs vào `crawler_logs`.
- Worker không được dùng `console.log` thuần túy cho các logs tiến trình cào quan trọng trong core crawler; bắt buộc sử dụng `logger.info` / `logger.error` của hệ thống để logs được đẩy thành công vào Supabase `crawler_logs` trên Dashboard.
- **Douyin session bootstrap**: Không xem raw cookie Douyin là session hoàn chỉnh. Nếu cần khỏi bắt người vận hành tự lấy `msToken`, `webid`, `fp`, `uifid`, worker phải dùng Playwright Chromium persistent context làm bước hydrate: nạp raw cookie hoặc login, mở `douyin.com`, đọc cookies/localStorage/navigator, xuất `DouyinSession`, chạy diagnostic hard gate, rồi mới cho HTTP API crawler chạy. Browser bootstrap không được biến thành crawler runtime mặc định.
- Database client của worker (`supabaseRest`) phải đọc response dưới dạng text trước khi parse JSON để tránh crash (`Unexpected end of JSON input`) khi PostgREST trả về response body trống (ví dụ: HTTP 201 Created với Prefer: return=minimal).
- Worker cập nhật task status completed/failed.
- Tương lai worker cần heartbeat, worker_id, capabilities và graceful shutdown.

## 4. Bảo mật & Xác thực

- **Luôn bảo vệ các Server Actions/API bằng `requireAdmin()` hoặc `requireUser()`**.
- **Internal APIs (Next.js)**: Nếu viết API nội bộ cho Worker gọi (như webhook, crawl callbacks), phải đưa vào `/api/worker/[...path]` hoặc tự check bằng `verifyApiToken(req, ["required_scope"])` từ `token.guard.ts`. KHÔNG được phép cho worker truyền Service Role Key trực tiếp.
- **Worker Authentication**: Crawler Pipeline sử dụng biến môi trường `API_TOKEN`. Token này sẽ được `token.guard.ts` ở Next.js kiểm tra. Next.js đóng vai trò **Token Guard Runtime Enforcement**. Worker truy cập Supabase qua proxy này.
- **Ràng buộc Proxy API Worker (`/api/worker/rest/v1/[...path]`)**:
  - **Deny-by-default**: Chỉ cho phép chính xác các phương thức HTTP và đường dẫn trong allowlist (13 endpoints được cấu hình trong `determineRequiredScopes` của `route.ts`). Mọi endpoint khác sẽ bị chặn và trả về `403`.
  - **Từ chối Wildcard (`*`)**: Không cho phép token mang scope wildcard `*` đi qua worker proxy. Bắt buộc phải cấu hình các scope cụ thể rõ ràng (VD: `crawler:claim`, `crawler:write_data`).
  - **Thắt chặt `GET crawler_accounts`**: Tách biệt rõ ràng 2 Mode truy xuất:
    - *Mode 1 (Checkout)*: Chỉ cho phép lấy 1 account active theo platform (bắt buộc đủ `platform`, `status=eq.active`, `order=last_used_at.asc.nullsfirst`, `limit=1`). Cưỡng chế chỉ trả về `id, username, cookie_data`.
    - *Mode 2 (Status check)*: Chỉ cho phép query theo ID (`id=eq.<uuid>`). Cưỡng chế chỉ trả về `id, status, failure_count`, và **tuyệt đối không trả về `cookie_data`**.
    - Bất kỳ query sai định dạng hoặc cố tình select cột ngoài phạm vi cho phép ở cả 2 mode đều bị trả về `400 Bad Request`.
  - **Kiểm tra chặt chẽ `PATCH`**: Áp dụng bắt buộc đối với `crawler_tasks`, `crawler_accounts`, `crawled_posts`, `crawled_authors`. ID query parameter phải tồn tại và có định dạng đúng `eq.<uuid>`. Body payload phải tuân thủ nghiêm ngặt whitelist cho từng bảng (chỉ bao gồm các trường được phép thay đổi, VD: `status, error_message, updated_at, metadata` cho `crawler_tasks`). Bất kỳ key lạ nào sẽ trả về `400`.
  - **Bắt buộc biến môi trường trong Worker**: Worker bắt buộc phải có `INTERNAL_API_URL` (không fallback về `SUPABASE_URL`) và `API_TOKEN` trong `.env`. Thiếu sẽ crash ngay khi boot.
- **Không bao giờ tin tưởng input từ client**. Validate cẩn thận, đặc biệt với Supabase RPC parameters.
- Desktop app có thể bật thêm worker, nhưng hiện chưa có worker manager.

## Media/download rules

- `cache_media` task đã deprecated. Không tạo UI/logic mới dựa vào command này.
- Creative detail không tạo task cache media khi user bấm play.
- Bilibili playback ưu tiên official iframe từ BVID (`platform_uid`), không ép direct CDN URL vào `<video>` và không upload R2 mặc định.
- Media direct URL nên được crawler/backfill chuẩn bị trước nếu platform không có embed.
- `/api/video/proxy` hiện là proxy/stream helper cho direct URL cần proxy, chưa phải video downloader service.
- Nút download không được hứa tải binary nếu chỉ có canonical URL; dùng nhãn `Mở nguồn`/`Sao chép link` hoặc chỉ bật tải thật khi có downloader service.
- Video downloader service tương lai nên tách khỏi crawler chính để không chặn crawl.

## Feature-status discipline

Không coi một trang là hoàn chỉnh chỉ vì route hoặc UI tồn tại. Luôn kiểm tra:

- Data đọc từ service/repository thật hay hard-code/local state?
- Mutation đã gọi server action/API thật chưa?
- Có persistence trong DB chưa?
- Có empty/loading/error state chưa?
- Có test/smoke test hoặc cách verify chưa?
- Docs status đã cập nhật chưa?

Ví dụ bẫy hiện tại:

- `/dash/accounts` có modal nạp tài khoản nhưng chưa nối mutation thật.
- `/dash/data/management` có storage metrics hard-code và tag manager local state.
- `/dash/creative/growth` đã có bảng history `post_metric_snapshots`, nhưng chưa tối ưu logic tính toán tăng trưởng thật cho `/dash/creative/growth`.
- Desktop app hiện mới là Desktop Runtime Package draft, Pake là legacy experiment.
- Bilibili đã có hướng iframe embed; đừng kéo lại về R2/direct CDN playback nếu không có lý do mới.

## Security reminders

- Không commit secrets.
- Không đưa service role key ra browser.
- Không migrate auth token về localStorage.
- Mutation từ browser phải validate payload và chống CSRF/Origin abuse.
- Logs không chứa cookie, password, token, QR secret.
- Không xóa vai trò hệ thống mặc định (`admin`, `user`) kể cả khi đã gỡ khóa sửa quyền (`is_locked = false`). Chặn xóa ở cả backend (`deleteRole`) và UI (`roles-panel.tsx`).
- Tránh chạy `supabase db reset` ở local dev vì làm mất dữ liệu cào thử nghiệm. Ưu tiên chạy trực tiếp SQL `UPDATE` hoặc `supabase db push` khi thay đổi schema/data nhỏ.
- **Ràng buộc khi ghi nhận metric snapshot (Guard Snapshot)**: Khi thực hiện lưu dữ liệu (`upsertPost`, `upsertPosts`, `upsertAuthor`), bắt buộc phải dùng các helper guard `hasPostMetricInput(stats)` và `hasAuthorMetricInput(author)` để kiểm tra sự hiện diện thực tế của metrics thô trước khi ghi nhận snapshot lịch sử, tuyệt đối tránh dùng các giá trị sau khi đã normalize (vì normalize sẽ biến dữ liệu trống thành `0` giả lập làm sai lệch lịch sử tăng trưởng).
- **Quy ước Next.js Middleware**: Dự án này sử dụng convention Next.js 16 (Turbopack) - file Middleware bắt buộc phải đặt tên là `proxy.ts` và export function `proxy`. Tuyệt đối không đổi tên thành `middleware.ts` vì sẽ làm mất hiệu lực bảo vệ route `/dash/*`.
- **Loại bỏ Mock Auth Bypass**: Cơ chế Mock Auth Bypass đã bị xóa hoàn toàn khỏi hệ thống (kể cả môi trường dev). Mọi hoạt động phát triển cục bộ bắt buộc phải xác thực qua Supabase local/test account thật. Dùng script `npx tsx scratch/create-dev-admin.ts` trong thư mục `dashboard` để tạo/xác minh tài khoản admin local từ cấu hình `.env.local`.
- **Tích hợp Cloudflare Turnstile & Brute-force**: Các form xác thực (Đăng nhập/Đăng ký) bắt buộc sử dụng Cloudflare Turnstile Invisible Captcha chạy ngầm. Khi phát triển cục bộ, cần có `NEXT_PUBLIC_TURNSTILE_SITE_KEY` và `[auth.captcha]` (Turnstile secret) được cấu hình nếu bật captcha. Các server actions (`loginAction`, `signUpAction`) và auth service phải nhận và gửi kèm `captchaToken` tới Supabase options.
- **Quy định mật khẩu & Rate Limit**: Cấu hình trong Supabase `config.toml` bắt buộc duy trì mật khẩu tối thiểu 8 ký tự, có cả chữ và số (`letters_digits`), và rate limit `sign_in_sign_ups = 10` để chống brute-force hiệu quả.
- **Bảo vệ Video Proxy chống SSRF**: API endpoint `/api/video/proxy` được tích hợp các lớp bảo vệ nghiêm ngặt: kiểm tra auth session (`getCurrentUser`), chỉ nhận giao thức HTTPS, giới hạn dung lượng tải (100MB), giới hạn content-type, phân giải DNS chặn IP private/local (chống SSRF), và so sánh CORS origin chính xác (`URL.origin`). Khi tích hợp thêm CDN/Platform mới, bắt buộc cập nhật domain allowlist tại `route.ts`.
- **Thắt chặt quyền Task & Account API**: Các API/Actions thay đổi trạng thái task (`createTask`, `createTasksBulk`, `cancelTask`, `retryTask`) và lấy thông tin nhạy cảm (`getAccounts`) bắt buộc phải bọc bằng guard `requireAdmin()`. Quyền thực thi các RPC (`claim_next_crawler_task`, `create_crawler_tasks`) cũng được thắt chặt bằng cách `REVOKE` khỏi vai trò public/anon và chỉ `GRANT` cho `service_role`/`authenticated` thích hợp.
- **Quy tắc Log Redaction & Cookie**: Không bao giờ truyền raw credentials/cookies vào log. Logger đã có bộ 3 Regex lọc Cookie (JSON, nháy đơn/kép, thô) và bộ Generic Token Redactor cho chuỗi dài >= 20 ký tự. Khi log msToken, chỉ in sự hiện diện và độ dài: `msToken: Có (độ dài X)`.
- **Cấm bypass console.log trong dev scripts**: Mọi script tiện ích của dev (ví dụ `check_tasks.ts`, `check_status.ts`) bắt buộc phải dùng `logger.info`/`logger.error` từ `./utils/index.js` để logs đi qua bộ lọc an toàn, tránh in thô `serviceRoleKey`.
- **Ràng buộc CSRF ở Production**: Hàm `verifyCSRF` chỉ tin cậy dynamic host từ `Host`/`X-Forwarded-Host` headers khi chạy local (`process.env.NODE_ENV !== "production"`). Trên production, bắt buộc so khớp với whitelist tĩnh (`NEXT_PUBLIC_SITE_URL` và `localhost`).
- **Cấm re-export trần Server Actions**: Tất cả server actions (`lib/actions/*.ts`) phải wrap service call bằng `requireUser()` hoặc `requireAdmin()` ở tầng action boundary. Cấm dùng `export { fn } from "@/lib/services/..."` trần vì sẽ bypass auth check. Pattern chuẩn: `export async function fn(...args) { await requireUser(); return fnService(...args); }`.
- **Security Headers bắt buộc**: Mọi response từ Dashboard phải có security headers cấu hình qua `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection: 1; mode=block`, `Permissions-Policy`. Không được xóa hoặc nới lỏng khi thêm tính năng mới.
- **Bảo mật Anon Key, RLS & Migrations**: 
  - Bất kỳ bảng dữ liệu nào (crawler outputs, configuration, logs) cũng phải bật RLS.
  - Các migrations thay đổi Policy cần bao gồm `DROP POLICY IF EXISTS` để đảm bảo tính idempotent khi dev reset database nhiều lần.
  - Các bảng chứa user data (như `exported_files`) phải scope RLS chặt chẽ theo owner (VD: `created_by = auth.uid()`).
  - Các bảng vận hành nhạy cảm (`crawler_tasks`, `crawler_logs`, `audit_logs`, `api_tokens`, `crawler_accounts`) bắt buộc phải bọc RLS Admin-only (`public.is_admin(auth.uid())`).
  - Đi kèm với RLS, các route tương ứng trên Dashboard (`/dash/tasks`, `/dash/accounts`) cũng phải được cấu hình chặn bằng Next.js Middleware (`proxy.ts`) để bảo vệ nguyên tắc 2 lớp (UI chuyển hướng + DB chặn query).
- **Test Scripts & Credentials**: Tuyệt đối không hardcode credentials (email/password) hoặc tự động gọi API `signup` trong các test scripts e2e (như `test-db-harden-e2e.ts`) để tránh rủi ro tạo rác/lộ lọt trên production. Bắt buộc phải đọc từ Environment Variables (VD: `TEST_ADMIN_EMAIL`). Mọi file scratch chứa dữ liệu nhạy cảm hoặc logic service_role phải nằm trong `.gitignore` (như `crawler-pipeline/scratch/`).
- **Bảo mật Cấu hình & Secrets (Settings & Secrets)**: Cấm lưu trữ cấu hình hệ thống nhạy cảm (như API key, Webhook URLs chứa token bí mật) ở `localStorage`. Bắt buộc phải di chuyển cấu hình nhạy cảm sang cơ sở dữ liệu `system_settings` được mã hóa tại server boundary. Các Server Actions tương ứng phải bọc bằng `requireAdmin()` và `verifyCSRF()`, đồng thời che giấu (masking) trước khi trả về client và không log các chuỗi nhạy cảm thô này vào `audit_logs`.
- **Chuẩn hóa & Validate Cookie**: Cookie nạp cho tài khoản crawler mặc định là dạng cookie string (`name=value; name2=value2`). Dashboard tự động chuẩn hóa (normalize) các định dạng cookie (JSON array export từ extension, JSON object phẳng, hoặc trích xuất trường `cookie` trong JSON) về dạng cookie string sạch trước khi lưu vào DB, riêng các JSON phức tạp chứa non-primitive (như Douyin session) sẽ được giữ nguyên cấu trúc JSON gốc. Với Douyin, cookie string thô chỉ là nguyên liệu bootstrap; session chạy thật phải là enriched `DouyinSession` đã hydrate qua browser context hoặc capture tương đương và pass diagnostic.
- **Nguyên tắc Content-Aware (Không video-centric)**: Hệ thống chấp nhận bài đăng chữ thuần (text-only) đặc trưng của Zhihu/Weibo. Khi không có media, phải gán `media_type = 'text'` và `media_status = 'not_applicable'` (không áp dụng media, không phải lỗi). Cấm tự ý gán `unavailable` hoặc sinh lỗi cào media cho text post. Cung cấp đầy đủ `title` (tiêu đề thật của câu hỏi/bài viết), `content_type` (ví dụ `answer`, `article`, `zvideo`, `note`), và `source_url` canonical cho bài viết.
- **Warm-up Cookie & Zhihu Search**: [DEPRECATED by 2026-07-10 ADR] Trước đây yêu cầu Playwright mở trang search thật (`/search?q=...`) trong 5 giây để warm-up/sync cookie. Hiện tại hệ thống đã chuyển đổi hoàn toàn sang kiến trúc HTTP-First không sử dụng trình duyệt.
- **Firecrawl không thay Douyin core**: Không chuyển Douyin search/detail/comment sang Firecrawl khi gặp lỗi session. Firecrawl là crawler web tổng quát có thể dùng như sidecar cho docs/web public hoặc diagnostic, nhưng không giải quyết trực tiếp lỗi Douyin API `status_code = 2483`/session chưa được chấp nhận. Root issue Douyin phải được xử lý trong `DouyinSession` bootstrap, fingerprint/traits, signing và session validator.
- **Cookie d_c0 Stripping**: Khi xử lý cookie zhihu để sinh chữ ký `x-zse-96`, phải strip dấu nháy kép `"` bọc ngoài của cookie `d_c0` (nếu có) để tránh lỗi chữ ký (`请求头或参数封装错误`, code 100).
- **Trạng thái zvideo**: Bài đăng `zvideo` của Zhihu mặc định được gán `media_type = 'video'`. Tuy nhiên, nếu zvideo thiếu cả cover URL lẫn video playlist thực tế (lỗi hoặc bị chặn), phải chuyển `media_status = 'unavailable'` và `media_source = 'none'`.

## Documentation rule

Khi thay đổi hành vi:

- Cập nhật `docs/project-status.md` nếu trạng thái tính năng đổi.
- Cập nhật `docs/roadmap.md` nếu hướng đi/ưu tiên đổi.
- Cập nhật `docs/decisions.md` nếu có quyết định kiến trúc.
- Cập nhật file architecture deep dive nếu thay đổi boundary kỹ thuật.

Docs là nguồn sự thật duy nhất cho agent sau. Nếu code và docs lệch nhau, phải ghi rõ phần nào là hiện trạng code và phần nào là mục tiêu.
