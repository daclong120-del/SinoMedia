# Agent Handbook

Cập nhật lần cuối: 2026-07-14
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
- **Thư mục Scratch & Test duy nhất**: Dự án quy định duy nhất 1 thư mục `scratch/` ở gốc dự án làm nơi lưu trữ các script thử nghiệm (`scratch/scripts/`) và các tài liệu kịch bản kiểm thử (`scratch/test-case/`). Tuyệt đối không tạo các thư mục `scratch` hoặc `tests` nằm rải rác ở các subpackages (`crawler-pipeline`, `dashboard`).
- **Subsystem Challenge Solver (`crawler-pipeline/src/challenge`)**: Tất cả logic giải anti-bot challenge (2Captcha API, Slider, Click, Turnstile) phải nằm trong subsystem `crawler-pipeline/src/challenge/` (`index.ts`, `solver.ts`, `types.ts`, `providers/two_captcha.ts`). `ChallengeSolverFactory` là cổng khởi tạo solver cho luồng `session_recovery.ts` của worker. Không nhúng code giải captcha vào Dashboard Client/Server Actions.

## Automation test runner rules

- `automation-test` là workspace kiểm thử độc lập. Không nhúng runner vào Dashboard production.
- HTML tĩnh không được tự chạy shell. Nút bấm "Run tests" phải gọi Node runner local trong `automation-test/runner`.
- Không mở `automation-test/runner/index.html` bằng `file://` để kiểm tra dashboard. Phải chạy `cd automation-test; npm run dashboard` rồi mở `http://localhost:<port>`, nếu không `/api/modules`, `/api/results`, `/api/runs`, `/api/runs/:runId/events` sẽ không tồn tại và UI có thể hiện `0 test case` hoặc không stream realtime log.
- Thêm module test theo kiểu registry: tạo `automation-test/tests/<module>/module.json` + spec tương ứng. Không hardcode module mới vào `runner/index.html` nếu registry đã đáp ứng.
- Test chính chỉ đặt trong `automation-test/tests/`. Script khảo sát DOM/debug đặt trong `automation-test/explore/` và không được chạy bởi `npm test`.
- Playwright reporter phải xuất HTML report và JSON result để dashboard local parse pass/fail.
- Mọi test case phải có ID ở đầu title (`TC_ROLE_001`, `TC_LOGIN_001`, ...), và nên dùng tag như `@ui`, `@backend`, `@role` để dashboard/script chạy theo suite.
- Credential test chính phải đọc từ env qua `ConfigReader`; không fallback sang email/password thật trong test suite chính.
- Khi UI test fail vì `TEST_USER_EMAIL` bị redirect `/dash/home?error=unauthorized`, ưu tiên sửa quyền/test data hoặc đổi account test. Không sửa source dashboard production chỉ để automation xanh.
- Không commit `playwright-report/`, `test-results/`, HTML dump, `.env`, hoặc thư mục cũ `evident_requirements/`.
- Evidence chuẩn nằm ở `automation-test/evidence/requirements/`.
- Không đánh dấu one-click automation runner là Done nếu chưa bấm dashboard chạy test thật và thấy summary pass/fail.

Realtime automation runner traps:

- Neu runner dashboard chay realtime, dung Node runner + SSE/EventSource (`POST /api/runs`, `GET /api/runs/:runId/events`) va custom reporter neu can. Khong quay lai model fetch dai doi Playwright xong roi moi tra mot cuc log/result.
- Realtime runner phai xoa `automation-test/reports/results.json` truoc moi run de tranh doc stale result khi process fail som.
- SSE runner phai replay event buffer hoac expose snapshot khi browser connect/reconnect; khong chi emit `run-started`, `run-begin`, `test-begin`, `run-finished` truoc khi client kip ket noi roi mat event.
- Live test table phai loai `_setup` khoi business counter, dung stable key cho test/retry thay vi chi dung `TC_ID`/`N/A`, va khong hardcode type la `UI` cho backend/API case.
- Khong commit `automation-test/reports/results.json`, `automation-test/playwright-report/`, `automation-test/test-results/`, screenshot/video/trace runtime, hoac whitespace-only churn trong runner files.

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
  - Đi kèm với RLS, các route tương ứng trên Dashboard (`/dash/tasks`, `/dash/accounts`) cũng phải được cấu hình chặn bằng Next.js Middleware (`proxy.ts`) để bảo vệ nguyên tắc 2 lớp (UI chuyển hướng + DB chặn query).
- **Test Scripts & Credentials**: Tuyệt đối không hardcode credentials (email/password) hoặc tự động gọi API `signup` trong các test scripts e2e (như `test-db-harden-e2e.ts`) để tránh rủi ro tạo rác/lộ lọt trên production. Bắt buộc phải đọc từ Environment Variables (VD: `TEST_ADMIN_EMAIL`). Mọi file scratch chứa dữ liệu nhạy cảm hoặc logic service_role phải nằm trong `.gitignore` (như thư mục `scratch/` ở gốc dự án).
- **Bảo mật Cấu hình & Secrets (Settings & Secrets)**: Cấm lưu trữ cấu hình hệ thống nhạy cảm (như API key, Webhook URLs chứa token bí mật) ở `localStorage`. Bắt buộc phải di chuyển cấu hình nhạy cảm sang cơ sở dữ liệu `system_settings` được mã hóa tại server boundary. Các Server Actions tương ứng phải bọc bằng `requireAdmin()` và `verifyCSRF()`, đồng thời che giấu (masking) trước khi trả về client và không log các chuỗi nhạy cảm thô này vào `audit_logs`.
- **Chuẩn hóa & Validate Cookie**: Cookie nạp cho tài khoản crawler mặc định là dạng cookie string (`name=value; name2=value2`). Dashboard tự động chuẩn hóa (normalize) các định dạng cookie (JSON array export từ extension, JSON object phẳng, hoặc trích xuất trường `cookie` trong JSON) về dạng cookie string sạch trước khi lưu vào DB, riêng các JSON phức tạp chứa non-primitive (như Douyin session) sẽ được giữ nguyên cấu trúc JSON gốc. Với Douyin, cookie string thô chỉ là nguyên liệu bootstrap; session chạy thật phải là enriched `DouyinSession` đã hydrate qua browser context hoặc capture tương đương và pass diagnostic.
- **Nguyên tắc Content-Aware (Không video-centric)**: Hệ thống chấp nhận bài đăng chữ thuần (text-only) đặc trưng của Zhihu/Weibo. Khi không có media, phải gán `media_type = 'text'` và `media_status = 'not_applicable'` (không áp dụng media, không phải lỗi). Cấm tự ý gán `unavailable` hoặc sinh lỗi cào media cho text post. Cung cấp đầy đủ `title` (tiêu đề thật của câu hỏi/bài viết), `content_type` (ví dụ `answer`, `article`, `zvideo`, `note`), và `source_url` canonical cho bài viết.
- **Warm-up Cookie & Zhihu Search**: [DEPRECATED by 2026-07-10 ADR] Trước đây yêu cầu Playwright mở trang search thật (`/search?q=...`) trong 5 giây để warm-up/sync cookie. Hiện tại hệ thống đã chuyển đổi hoàn toàn sang kiến trúc HTTP-First không sử dụng trình duyệt.
- **Firecrawl không thay Douyin core**: Không chuyển Douyin search/detail/comment sang Firecrawl khi gặp lỗi session. Firecrawl là crawler web tổng quát có thể dùng như sidecar cho docs/web public hoặc diagnostic, nhưng không giải quyết trực tiếp lỗi Douyin API `status_code = 2483`/session chưa được chấp nhận. Root issue Douyin phải được xử lý trong `DouyinSession` bootstrap, fingerprint/traits, signing và session validator.
- **Cookie d_c0 Stripping**: Khi xử lý cookie zhihu để sinh chữ ký `x-zse-96`, phải strip dấu nháy kép `"` bọc ngoài của cookie `d_c0` (nếu có) để tránh lỗi chữ ký (`请求头或参数封装错误`, code 100).
## Documentation rule

Khi thay đổi hành vi:

- Cập nhật `docs/project-status.md` nếu trạng thái tính năng đổi.
- Cập nhật `docs/roadmap.md` nếu hướng đi/ưu tiên đổi.
- Cập nhật `docs/decisions.md` nếu có quyết định kiến trúc.
- Cập nhật file architecture deep dive nếu thay đổi boundary kỹ thuật.

Docs là nguồn sự thật duy nhất cho agent sau. Nếu code và docs lệch nhau, phải ghi rõ phần nào là hiện trạng code và phần nào là mục tiêu.

## 2026-07-21 Agent note - Douyin `verify_check`

- Khi Douyin diagnostic pass profile/self endpoint nhung search tra `search_nil_info.search_nil_type = "verify_check"` hoac `result_status = 5`, ket luan dung la `challenge_required`, khong phai frontend pending, queue worker loi, parser rong, hay cookie-only expired chung chung.
- Huong fix dung la session recovery: Playwright persistent context -> challenge strategy (`manual`, `2captcha`, hoac `manual_then_2captcha`) -> export lai `DouyinSession` -> diagnostic lai -> moi crawl HTTP API.
- Dat provider 2Captcha trong `crawler-pipeline/src/challenge/`; dat Douyin-specific logic trong `crawler-pipeline/src/crawl/douyin/session_recovery.ts` hoac module tuong duong. `core.ts` chi orchestration, `http_client.ts` chi classify response.
- Dashboard `/dash/settings` chi la control/config surface. Khong viet code giai challenge trong Client Component hoac Server Action cua Settings.
- Worker hien chua co allowlist doc `system_settings`; neu muon dung key tu DB thay vi env, phai them endpoint/scope hep, vi du `GET /api/worker/settings/captcha` voi `crawler:read_settings`.
- Khong log raw cookie, `msToken`, 2Captcha API key, challenge payload, hoac solver token. Chi log provider, status, attempt count, va reason da redacted.
- Khong mark Douyin challenge recovery la Done neu chua co smoke task Douyin search that luu du so luong yeu cau sau khi gap `verify_check`.
