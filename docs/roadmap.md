# Roadmap

Cập nhật lần cuối: 2026-07-08  
Mục đích: ghi hướng đi hiện tại để người và AI agent không kéo dự án về các kiến trúc cũ.

## North star

SinoMedia đi theo mô hình:

```text
Dashboard / Desktop App
  -> Supabase control plane
    -> crawler workers / video downloader workers
      -> Supabase normalized tables + external embed/original URLs
      -> optional Cloudflare R2 archive/cache
```

Dashboard và desktop app không tự crawl nặng trong UI process. Chúng tạo task, cấu hình worker, xem trạng thái, xem dữ liệu và điều phối download.

## Phase 0: Documentation control plane

Trạng thái: In progress

Mục tiêu:

- Có `docs/project-status.md` để theo dõi tính năng đã xong/chưa xong.
- Có `docs/roadmap.md` để khóa hướng worker/desktop.
- Có `docs/agent-handbook.md` để AI agent học ràng buộc, bẫy và lịch sử.
- Mọi agent phải đọc docs trước khi sửa code.

Definition of done:

- Mỗi thay đổi lớn cập nhật status/roadmap/decision tương ứng.
- Không còn tình trạng UI prototype bị hiểu nhầm là production-ready.

## Phase 1: Stabilize Dashboard

Trạng thái: In progress

Mục tiêu:

- Đưa read path về Server Component -> Service -> Repository -> Supabase.
- Browser Supabase client chỉ dùng realtime.
- Loại bỏ mock fallback âm thầm trong production path.
- Các trang quan trọng có empty/error/loading state rõ.
- Mutation cho accounts/proxies/tasks/member/export được nối backend thật.

Ưu tiên gần:

- Task lifecycle: tạo task -> worker claim -> logs realtime -> completed/failed.
- Accounts page: nạp cookie, unban, delete, health state.
- Proxies page: real health check hoặc ghi rõ fake/test mode.
- Data management: bỏ số hard-code, nối metrics/cleanup/export thật hoặc hạ nhãn thành draft.
- Creative growth: thêm bảng lịch sử metric nếu muốn tính growth thật.

## Phase 2: Crawler Pipeline as Worker

Trạng thái: In progress

Mục tiêu:

- `crawler-pipeline` là worker độc lập, có thể chạy trên VPS, máy desktop hoặc máy phụ.
- Worker claim task qua Supabase RPC, không phụ thuộc lifecycle của dashboard.
- Worker ghi heartbeat/capabilities để dashboard biết worker nào đang sống.
- Task metadata là contract mở rộng cho platform/options.

Backlog:

- Worker identity: `worker_id`, hostname, version, capabilities, last_heartbeat.
- Graceful shutdown: xử lý SIGINT/SIGTERM, không bỏ task ở trạng thái running mãi.
- Retry policy: phân biệt lỗi rate-limit, auth expired, proxy dead, parsing/schema.
- Platform smoke tests: ít nhất search/crawl/comments cho platform ưu tiên.
- Account/proxy health policy: tự ban/tạm nghỉ/rotate có audit log.

Không làm:

- Không nhúng crawler vào Next.js request lifecycle.
- Không tạo lại command `cache_media`.
- Không để UI bấm play tạo task crawl/cache mới.
- Không upload R2 mặc định cho Bilibili nếu chỉ cần xem trên Dashboard; lưu BVID/canonical URL và dùng embedded iframe player.

## Phase 3: Video Downloader Service

Trạng thái: Planned

Mục tiêu:

- Tách download video thành service/worker riêng với queue riêng hoặc task type riêng.
- Desktop app hoặc máy phụ có thể bật downloader để tải media về local hoặc R2 tùy cấu hình, nhưng Bilibili playback mặc định chỉ cần link gốc/BVID.
- Downloader không làm nghẽn crawler chính.

Đề xuất contract:

| Thành phần | Vai trò |
|---|---|
| `download_jobs` hoặc task type `download_media` | Hàng đợi download media rõ ràng, tách khỏi crawl nội dung. |
| downloader worker | Nhận canonical/original URL, tải stream nếu thật sự cần file local/archive, verify size/checksum, cập nhật status. |
| desktop controls | Bật/tắt downloader local, chọn folder local hoặc upload R2 khi user chủ động archive. |
| rate/concurrency config | Tránh làm cháy băng thông/proxy/CDN. |

Hiện trạng:

- Bilibili Creative Detail có thể render official iframe từ BVID, không cần proxy/R2 để phát.
- `/api/video/proxy?url=...` chỉ là helper cho platform/direct URL cần proxy; không phải downloader service.
- Chưa có service tải video độc lập.
- Chưa có local folder/download manager trong desktop.

## Phase 4: Desktop Runtime Package

Trạng thái: In Progress (Đã hiện thực hóa build script scaffold + Full extraction, launcher, và health check smoke test)

Mục tiêu:

- Sử dụng Desktop Runtime Package để đóng gói Next.js dashboard và crawler worker thành ứng dụng độc lập.
- Pake đã bị loại bỏ vì không phù hợp với yêu cầu.
- Desktop app mở dashboard local/remote.
- Sau đó mới thêm worker controls: bật local crawler worker, bật downloader worker, xem logs.

Quyết định hiện tại:

- Desktop Runtime Package là hướng packaging chính.
- Không sử dụng Pake. Electron chỉ là fallback nếu cần quyền native sâu hơn.

Các câu hỏi cần chốt:

- Desktop app load remote dashboard hay tự khởi chạy Next server local?
- Worker local chạy như child process, service nền, hay user tự bật bằng command?
- Secrets cho Supabase/R2/downloader lưu ở đâu trên máy người dùng?
- Video tải về local nằm trong folder nào, quyền truy cập ra sao?

## Phase 5: Multi-machine Workers

Trạng thái: Planned

Mục tiêu:

- Người dùng có thể thêm máy khác làm worker.
- Dashboard biết worker nào online/offline, đang chạy task nào.
- Có capability flags: crawler platforms, embedded playback support, downloader, R2 archive, local-only download.

Backlog:

- Worker registration token.
- Worker heartbeat table.
- Worker assignment policy.
- Task lease timeout/reclaim.
- UI worker management.
- Logs theo worker/task.

## Revisit triggers

Xem lại roadmap khi có một trong các dấu hiệu:

- Supabase RPC queue không đủ throughput.
- Cần scheduling phức tạp hơn polling worker.
- Desktop cần quyền native vượt quá khả năng của Runtime Package hiện tại.
- Download media cần resume/chunk/checksum/local library management.
- Multi-tenant/team permission trở thành yêu cầu thật.
