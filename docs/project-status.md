# Project Status

Cập nhật lần cuối: 2026-07-09  
Mục đích: một trang sống để biết SinoMedia đã làm được gì, phần nào đang chạy, phần nào chỉ là phác thảo, và phần nào cần agent kiểm tra trước khi phát triển tiếp.

## Legend

| Trạng thái | Nghĩa |
|---|---|
| Done | Có code/luồng chính rõ ràng, đã nối vào kiến trúc hiện hành. Vẫn cần test khi sửa. |
| Partial | Có UI hoặc backend một phần, nhưng còn thiếu mutation, persistence, dữ liệu thật, hoặc kiểm chứng end-to-end. |
| Draft | Chủ yếu là thiết kế/UI/local state/hard-code, chưa nên coi là tính năng hoàn chỉnh. |
| Planned | Định hướng đã rõ, code chưa có hoặc mới có placeholder. |
| Deprecated | Không dùng cho code mới. |

## Snapshot

SinoMedia hiện là hệ thống gồm 4 khối:

| Khối | Trạng thái | Ghi chú |
|---|---|---|
| Dashboard | Partial | Next.js App Router, nhiều trang đã có service/repository và server actions. Cột mốc quan trọng: `/dash/tasks` đã Done (nối realtime và xử lý tasks thật). |
| Crawler Pipeline | Partial | Worker TypeScript độc lập có queue loop, claim task qua Supabase RPC, platform factory, account/proxy pool. Bilibili crawler có đầy đủ phase, log và cào bình luận ổn định. |
| Supabase/Media | Partial | Supabase là control plane/data store. Đã hoàn thành khóa quyền truy cập thô của anon key, bật RLS cho toàn bộ bảng và thắt chặt RPC nhạy cảm. Tích hợp kịch bản kiểm thử bảo mật tự động 27/27 test cases (RLS + Proxy) đạt 100%. |
| Desktop App | Partial | Đã hoàn thành build script Scaffold & Full, tích hợp embedded Node.exe, launcher scripts, C# wrapper SinoMedia.exe và health check smoke test tự động. |

## Product direction hiện tại

- Dashboard là control plane: tạo task, xem dữ liệu, xem log, quản lý account/proxy/settings.
- `crawler-pipeline` là worker độc lập: claim task từ Supabase, crawl, normalize, ghi DB; chỉ upload R2 khi task/flow thật sự cần archive/cache.
- Bilibili playback dùng Embedded Iframe Player khi có BVID (`platform_uid`), không cần direct CDN URL hoặc R2 để phát.
- Tương lai: Chuyển từ Pake draft sang SinoMedia Desktop Runtime Package. Mục tiêu đóng gói độc lập toàn bộ Dashboard, Worker và embedded runtime, không yêu cầu cài môi trường.
- Tương lai có video downloader service riêng để máy khác hoặc local desktop tải video, không nhét toàn bộ logic download vào UI.
- Media cache/download không tạo task `cache_media`; task này đã bị deprecated trong worker. Với Bilibili, UI chỉ cần BVID/canonical URL để render iframe hoặc mở nguồn.

## Dashboard page status

| Route | Trạng thái | Ghi chú |
|---|---|---|
| `/` | Done | Redirect/entrypoint dashboard. |
| `/login`, `/sign-up`, `/forgot-password` | Done | Gỡ bỏ hoàn toàn Mock Auth Bypass. Dev bắt buộc sử dụng tài khoản Supabase local/test thật. Next.js Middleware chạy thực sự (proxy.ts) bảo vệ các route `/dash/*`. |
| `/dash/home` | Partial | Có service metrics, một số trend còn TODO hoặc phụ thuộc dữ liệu thật. |
| `/dash/tasks` | Done | Giao diện quản lý task hoàn chỉnh, kết nối DB thật, realtime status thật, nút Cancel/Retry (Optimistic). Đã thắt chặt bảo mật 2 lớp: Admin-only Next.js Middleware và Admin-only RLS trên DB. |
| `/dash/accounts` | Draft | Đọc account qua action, modal nạp tài khoản và nút unban/xóa chưa nối mutation thật. Được bảo vệ bởi Admin-only Middleware & RLS. |
| `/dash/proxies` | Done | Đã bọc `requireAdmin()` ở cấp Server Component Page và Server Action, thêm `verifyCSRF()` bảo vệ đột biến. Được bảo vệ bởi Middleware & RLS. |
| `/dash/audit-logs` | Done | Đọc nhật ký thật, đã bọc `requireAdmin()` ở Server Component Page và Middleware. RLS DB đã được bật cho Admin-only. |
| `/dash/settings` | Done | Đã bọc `requireAdmin()` ở Server Component Page và Middleware. Cấu hình nhạy cảm (`api_key`, `default_webhook_url`) được mã hóa ở DB và che dấu (masking) khi hiển thị. |
| `/dash/manage-account/members` | Done | Đã nối invite flow thật, tự động gán role. Tích hợp quản lý **API Tokens Panel** có thời hạn, status (active/revoked), ngày dùng cuối. Đã có **Token Guard Runtime Enforcement** bảo vệ API Proxy. |
| `/dash/data/posts` | Partial | Có trang list/detail UI, nhưng còn comment `Cover mock`/`Player mockup`; cần nối media/detail hoàn chỉnh. |
| `/dash/data/authors` | Partial | Có server/service read path, cần kiểm chứng dữ liệu thật/filter. |
| `/dash/data/management` | Partial | Đã bọc `requireAdmin()` ở Server Component Page và Middleware. Các nút dọn dẹp và tag manager vẫn là Draft (chưa nối backend thật). |
| `/dash/creative/search` | Partial | Có service read, filter client, modal detail. Một số API GET creative vẫn tồn tại để compatibility. |
| `/dash/creative/new` | Partial | Có service read và client view. |
| `/dash/creative/trending` | Partial | Có sort theo views; cần kiểm chứng metric/index. |
| `/dash/creative/growth` | Partial | Đã có bảng lịch sử `post_metric_snapshots`, cần hoàn thiện logic tính toán growth thật từ lịch sử thay vì views hiện tại. |
| `/dash/creative/calendar` | Draft | Có calendar UI từ dữ liệu creative, export chỉ alert "đang phát triển". |
| `/dash/creative/advertisers` | Partial | List/profile service lấy thống kê thực tế. Trang chi tiết (`/dash/creative/advertisers/[id]`) vẽ biểu đồ xu hướng từ dữ liệu lịch sử `post_metric_snapshots` thật với badge phân biệt "Thực tế" / "Ước tính". |
| `/dash/creative/[id]` | Partial | Có detail view. Bilibili đi theo hướng iframe embed khi có BVID; các platform khác vẫn cần kiểm chứng original URL/proxy/R2 tùy strategy. |

## Crawler Pipeline status

| Capability | Trạng thái | Ghi chú |
|---|---|---|
| CLI entrypoint | Done | `bootstrap`, `crawl`, `creator`, `search`, `comments`, `add-account`. `crawl` không target sẽ khởi chạy queue worker. |
| Queue worker | Done | Claim task Supabase RPC. Đã **gia cố log redaction** và bảo mật **API Token Runtime Enforcement**. Đã pass Security Gate với các chế độ thắt chặt GET crawler_accounts (Mode 1: Checkout chỉ trả về id/username/cookie_data, Mode 2: Status check chỉ trả về id/status/failure_count, cấm leak cookie_data). |
| Task metadata | Partial | Worker đọc tags, language, crawl_comments, crawl_sub_comments, upload_r2, headless từ `task.metadata`. |
| Platform factory | Partial | Có factory cho nhiều platform; platform không hỗ trợ sẽ throw rõ ràng. |
| Platforms | Partial | Có module cho Bilibili, Douyin, Kuaishou, Tieba, Weibo, XHS, Zhihu. Mức ổn định từng platform chưa đồng đều. |
| Login/session | Partial | Một số platform còn báo QR auto-login chưa hỗ trợ hoặc cần cookie cục bộ. |
| Account/proxy pool | Partial | Có pool/account rotation, nhưng cần health policy và dashboard mutation hoàn chỉnh hơn. |
| R2 upload | Optional | Có uploader/dedup, nhưng không còn là đường phát mặc định cho Bilibili. Dùng khi cần archive/cache/report/offline. |
| Cache media task | Deprecated | Worker đã throw nếu command là `cache_media`. Không thêm UI tạo task này nữa. |
| Metric Refresh | Done | CLI refresh `npm run refresh` hoạt động tốt. Đã tích hợp cơ chế **Guard Snapshot** ở cấp độ `supabase_writer.ts` (kiểm tra stats gốc trước khi lưu snapshot) chống ghi nhận dữ liệu 0 giả lập do normalization fallback. |

## Desktop App status

| Capability | Trạng thái | Ghi chú |
|---|---|---|
| Desktop Runtime Package | Done | Đã hiện thực hóa build script idempotent `build-runtime-package.ps1` tạo Scaffold và Full package hoàn chỉnh. |
| Bundled dashboard server | Done | Đã trích xuất Dashboard Next.js server dưới dạng standalone, chạy bằng embedded Node runtime cục bộ. |
| Bundled crawler worker | Done | Đã trích xuất Crawler worker (`crawler-pipeline`), chạy bằng embedded Node qua tsx. |
| Health-check & Smoke Test | Done | Tích hợp kịch bản `health-check.ps1` với chế độ tĩnh và Smoke test động (`-Smoke`) tự động kiểm thử PID và HTTP port, sau đó dừng an toàn. |
| SinoMedia.exe Launcher | Done | Launcher C# (`src/Launcher.cs`) quản lý vòng đời dashboard & worker, tự động compile bằng `csc.exe` của Windows khi build Full. |
| Activate local worker | Partial | Launcher C# tự động khởi chạy worker nếu có config `.env`. Cần phát triển UI manager hoàn chỉnh hơn trong tương lai. |
| Remote worker management | Planned | Cần worker registration/heartbeat/capabilities để máy khác nhận task. |
| Video downloader service | Planned | Với Bilibili hiện chỉ cần canonical URL/BVID để mở nguồn. Tải video thật về máy là việc của downloader service sau này, không phải R2 cache mặc định. |

## Known gaps

- Thiếu status automation: chưa có script tự sinh page status từ routes/services.
- GitNexus index hiện có thể chậm hơn HEAD vài commit; agent phải đọc file thật trước khi kết luận.
- Root README từng đóng vai trò docs index; `docs/README.md` mới là cửa vào của thư mục docs.
- Một số docs cũ hoặc design JSON đã bị xóa/di chuyển; không dùng đường dẫn cũ làm source of truth.
- Không coi "route tồn tại" là "feature xong". Phải kiểm tra data path, mutation path, empty/error state và persistence.

## Update checklist

Khi hoàn thành một tính năng:

1. Cập nhật trạng thái route/capability ở file này.
2. Nếu thay đổi hướng kiến trúc, cập nhật `docs/roadmap.md` hoặc `docs/decisions.md`.
3. Nếu phát hiện bẫy cho agent, cập nhật `docs/agent-handbook.md`.
4. Nếu sửa code symbol, tuân thủ GitNexus impact analysis trước khi sửa và `detect_changes()` trước khi commit.
