# Agent Handbook

Cập nhật lần cuối: 2026-07-09  
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
- Database client của worker (`supabaseRest`) phải đọc response dưới dạng text trước khi parse JSON để tránh crash (`Unexpected end of JSON input`) khi PostgREST trả về response body trống (ví dụ: HTTP 201 Created với Prefer: return=minimal).
- Worker cập nhật task status completed/failed.
- Tương lai worker cần heartbeat, worker_id, capabilities và graceful shutdown.
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
- Desktop app hiện mới là Pake packaging draft.
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
- **Giới hạn Mock Auth**: Mock Auth bypass chỉ được phép chạy khi `process.env.NODE_ENV !== "production"` và đồng thời có cờ `process.env.ENABLE_MOCK_AUTH === "true"`. Ở môi trường production, hệ thống bắt buộc phải fail-closed về Supabase Auth thật.
- **Bảo vệ Video Proxy chống SSRF**: API endpoint `/api/video/proxy` được tích hợp các lớp bảo vệ nghiêm ngặt: kiểm tra auth session (`getCurrentUser`), chỉ nhận giao thức HTTPS, giới hạn dung lượng tải (100MB), giới hạn content-type, phân giải DNS chặn IP private/local (chống SSRF), và so sánh CORS origin chính xác (`URL.origin`). Khi tích hợp thêm CDN/Platform mới, bắt buộc cập nhật domain allowlist tại `route.ts`.
- **Thắt chặt quyền Task & Account API**: Các API/Actions thay đổi trạng thái task (`createTask`, `createTasksBulk`, `cancelTask`, `retryTask`) và lấy thông tin nhạy cảm (`getAccounts`) bắt buộc phải bọc bằng guard `requireAdmin()`. Quyền thực thi các RPC (`claim_next_crawler_task`, `create_crawler_tasks`) cũng được thắt chặt bằng cách `REVOKE` khỏi vai trò public/anon và chỉ `GRANT` cho `service_role`/`authenticated` thích hợp.
- **Quy tắc Log Redaction & Cookie**: Không bao giờ truyền raw credentials/cookies vào log. Logger đã có bộ 3 Regex lọc Cookie (JSON, nháy đơn/kép, thô) và bộ Generic Token Redactor cho chuỗi dài >= 20 ký tự. Khi log msToken, chỉ in sự hiện diện và độ dài: `msToken: Có (độ dài X)`.
- **Cấm bypass console.log trong dev scripts**: Mọi script tiện ích của dev (ví dụ `check_tasks.ts`, `check_status.ts`) bắt buộc phải dùng `logger.info`/`logger.error` từ `./utils/index.js` để logs đi qua bộ lọc an toàn, tránh in thô `serviceRoleKey`.
- **Ràng buộc CSRF ở Production**: Hàm `verifyCSRF` chỉ tin cậy dynamic host từ `Host`/`X-Forwarded-Host` headers khi chạy local (`process.env.NODE_ENV !== "production"`). Trên production, bắt buộc so khớp với whitelist tĩnh (`NEXT_PUBLIC_SITE_URL` và `localhost`).
- **Bảo mật Anon Key, RLS & Migrations**: 
  - Bất kỳ bảng dữ liệu nào (crawler outputs, configuration, logs) cũng phải bật RLS.
  - Các migrations thay đổi Policy cần bao gồm `DROP POLICY IF EXISTS` để đảm bảo tính idempotent khi dev reset database nhiều lần.
  - Các bảng chứa user data (như `exported_files`) phải scope RLS chặt chẽ theo owner (VD: `created_by = auth.uid()::text`).
- **Test Scripts & Credentials**: Tuyệt đối không hardcode credentials (email/password) hoặc tự động gọi API `signup` trong các test scripts e2e (như `test-db-harden-e2e.ts`) để tránh rủi ro tạo rác/lộ lọt trên production. Bắt buộc phải đọc từ Environment Variables (VD: `TEST_ADMIN_EMAIL`).

## Documentation rule

Khi thay đổi hành vi:

- Cập nhật `docs/project-status.md` nếu trạng thái tính năng đổi.
- Cập nhật `docs/roadmap.md` nếu hướng đi/ưu tiên đổi.
- Cập nhật `docs/decisions.md` nếu có quyết định kiến trúc.
- Cập nhật file architecture deep dive nếu thay đổi boundary kỹ thuật.

Docs là nguồn sự thật duy nhất cho agent sau. Nếu code và docs lệch nhau, phải ghi rõ phần nào là hiện trạng code và phần nào là mục tiêu.
