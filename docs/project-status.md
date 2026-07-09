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
| Supabase/Media | Partial | Supabase là control plane/data store. Đã hoàn thành khóa quyền truy cập thô của anon key, bật RLS cho toàn bộ bảng (kể cả audit_logs, exported_files, crawled_comments) và thắt chặt các RPC nhạy cảm. E2E test cho admin/non-admin đạt 100%. |
| Desktop App | Draft | Hiện là packaging bằng Pake cho dashboard local. Chưa phải desktop runtime có worker manager/video downloader service tích hợp. |

## Product direction hiện tại

- Dashboard là control plane: tạo task, xem dữ liệu, xem log, quản lý account/proxy/settings.
- `crawler-pipeline` là worker độc lập: claim task từ Supabase, crawl, normalize, ghi DB; chỉ upload R2 khi task/flow thật sự cần archive/cache.
- Bilibili playback dùng Embedded Iframe Player khi có BVID (`platform_uid`), không cần direct CDN URL hoặc R2 để phát.
- Tương lai desktop app được build bằng Pake trước. Desktop app cần có khả năng kích hoạt thêm local worker hoặc cấu hình remote worker.
- Tương lai có video downloader service riêng để máy khác hoặc local desktop tải video, không nhét toàn bộ logic download vào UI.
- Media cache/download không tạo task `cache_media`; task này đã bị deprecated trong worker. Với Bilibili, UI chỉ cần BVID/canonical URL để render iframe hoặc mở nguồn.

## Dashboard page status

| Route | Trạng thái | Ghi chú |
|---|---|---|
| `/` | Done | Redirect/entrypoint dashboard. |
| `/login`, `/sign-up`, `/forgot-password` | Done | Đã thắt chặt bảo mật Mock Auth (fail-closed trên production, chỉ cho phép ở dev mode với cờ ENABLE_MOCK_AUTH=true), Next.js Middleware chạy thực sự (proxy.ts) và bảo vệ các route `/dash/*`. |
| `/dash/home` | Partial | Có service metrics, một số trend còn TODO hoặc phụ thuộc dữ liệu thật. |
| `/dash/tasks` | Done | Giao diện quản lý task hoàn chỉnh, kết nối DB thật, realtime status thật, nút Cancel/Retry (Optimistic), hiển thị phase và tiến trình cào bình luận (comment_progress) thời gian thực. |
| `/dash/accounts` | Draft | Đọc account qua action, nhưng modal nạp tài khoản và nút unban/xóa chưa nối mutation thật. |
| `/dash/proxies` | Partial | Có service/actions cho proxy; health check hiện vẫn là TODO/fake ở repository. |
| `/dash/audit-logs` | Partial | Có audit repository/service, dữ liệu đã được bảo vệ bằng RLS admin-only. Cần dữ liệu thật. |
| `/dash/settings` | Draft | Chủ yếu local/UI settings; RLS cho exported_files đã được thắt chặt theo owner (`created_by`). |
| `/dash/manage-account/members` | Done | Đã nối invite flow thật, tự động gán role. Đồng thời tích hợp quản lý **API Tokens Panel** có thời hạn, status (active/revoked), ngày dùng cuối, và Server actions thắt chặt CSRF. |
| `/dash/data/posts` | Partial | Có trang list/detail UI, nhưng còn comment `Cover mock`/`Player mockup`; cần nối media/detail hoàn chỉnh. |
| `/dash/data/authors` | Partial | Có server/service read path, cần kiểm chứng dữ liệu thật/filter. |
| `/dash/data/management` | Draft | Nhiều chỉ số storage hard-code; tag manager local state; cleanup buttons chưa nối backend thật. |
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
| Queue worker | Done | Claim task Supabase RPC, cập nhật progress/phase. Đã **gia cố log redaction** (mask cookie nhiều cặp, msToken kèm từ nối, generic token redactor >= 20 ký tự) và chuyển dev check scripts sang logger. |
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
| Pake packaging | Draft | `desktop-app/build.bat` và README hướng dẫn đóng dashboard local thành app. |
| Bundled dashboard server | Planned | Cần quyết định cách khởi chạy Next server local trong desktop distribution. |
| Activate local worker | Planned | Desktop cần UI/config để bật/tắt worker local, nhưng hiện chưa có worker manager trong app. |
| Remote worker management | Planned | Cần worker registration/heartbeat/capabilities để máy khác nhận task. |
| Video downloader service | Planned | Với Bilibili hiện chỉ cần canonical URL/BVID để mở nguồn. Tải file thật về máy là việc của downloader service sau này, không phải R2 cache mặc định. |

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
