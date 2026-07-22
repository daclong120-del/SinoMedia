# Roadmap

Cập nhật lần cuối: 2026-07-14
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

## Phase 1.5: One-click Automation Test Runner

Trạng thái: In progress

Mục tiêu:

- `automation-test` là workspace kiểm thử độc lập, dùng Playwright TypeScript.
- Một dashboard local cho phép bấm `Run All Tests`, `Run UI Tests`, `Run Backend Tests`, hoặc chạy từng module lấy từ `tests/<module>/module.json`.
- Dashboard không tự chạy shell từ HTML tĩnh; nó gọi Node runner server trong `automation-test/runner`.
- Dashboard phải mở qua `npm run dashboard` và URL `http://localhost:<port>`; mở `runner/index.html` bằng `file://` sẽ không có API và dễ hiểu nhầm là `0 test case`.
- Playwright xuất cả HTML report và JSON result để dashboard hiển thị pass/fail theo từng test case.
- Module registry là hướng mở rộng: thêm module bằng thư mục `tests/<module>/`, file spec, và `module.json`; không hardcode module mới vào dashboard UI.
- `automation-test/tests/` chỉ chứa test chính; `automation-test/explore/` chỉ dùng khảo sát DOM/debug và không chạy trong suite mặc định.
- Artifact như `playwright-report`, `test-results`, HTML dump không được commit.

Definition of done:

- `npm run typecheck` pass trong `automation-test`.
- `npm run test:module -- <moduleId> -- --list` chạy được cho từng module đã đăng ký.
- `npm run dashboard` mở local runner.
- Bấm `Run All` hoặc `Run Module` chạy test thật và hiển thị total/passed/failed/skipped.
- Test user trong `.env` có quyền phù hợp với route UI cần test; không còn fail vì `/dash/home?error=unauthorized`.
- Có link mở Playwright HTML report.
- Không còn reference `evident_requirements`; dùng `automation-test/evidence/requirements`.
- Các artifact cũ đã được gỡ khỏi git index.

Backlog coverage A-Z:

- Auth/Login.
- Role Management.
- Member Management.
- Tasks lifecycle.
- Accounts.
- Proxies.
- Settings.
- Data pages.
- Creative Hub.
- Worker/API/service regression.

Realtime runner direction:

- Local runner dashboard di theo huong `POST /api/runs` tao `runId` ngay, sau do `GET /api/runs/:runId/events` stream log/event bang SSE/EventSource. Khong quay lai model `POST /api/run` doi Playwright chay xong moi tra mot cuc JSON.
- `reports/results.json` van la final source of truth de reconcile ket qua cuoi run, nhung runner phai xoa file result cu truoc moi run de tranh hien pass/fail stale khi Playwright chet som.
- SSE client phai nhan du event ngay ca khi connect tre: can replay event buffer hoac lay snapshot tu `GET /api/runs/:runId`, khong chi replay raw log lines.
- Live table/counter phai loai `_setup` khoi business test case, dung stable test key thay vi TC_ID/N/A don le, va khong hardcode tat ca live case la `UI`.

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
- Douyin session bootstrap: thêm Playwright Chromium persistent context làm session hydrator (`raw cookie -> browser context -> enriched DouyinSession -> diagnostic -> HTTP API crawler`). Browser chỉ phục vụ bootstrap/diagnostic, không trở lại thành crawler runtime mặc định.

Không làm:

- Không nhúng crawler vào Next.js request lifecycle.
- Không tạo lại command `cache_media`.
- Không để UI bấm play tạo task crawl/cache mới.
- Không upload R2 mặc định cho Bilibili nếu chỉ cần xem trên Dashboard; lưu BVID/canonical URL và dùng embedded iframe player.
- Không bắt người vận hành Douyin tự điền thủ công `msToken`, `webid`, `fp`, `uifid`; các field này phải được hydrate/xuất từ browser bootstrap hoặc session capture tương đương.
- Không thay thế Douyin HTTP API adapter bằng Firecrawl. Firecrawl chỉ được xem là sidecar tùy chọn cho generic web/docs crawl hoặc diagnostic ngoài hot path, không phải crawler runtime cho Douyin search/detail/comment.

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
- **Nguyên tắc cốt lõi**: Ưu tiên “chạy độc lập thật” (Portable) trước, “cài đặt đẹp” (Inno Setup) sau, “native shell đẹp” (Tauri/Electron) sau nữa.

Lộ trình thực thi chi tiết (Desktop Roadmap):
1. **Portable Runtime ổn định** (Done): Đóng gói release folder chạy độc lập qua `SinoMedia.exe`, tích hợp standalone server, worker và embedded Node.
2. **Smoke Test sạch** (Done): Verify PID và HTTP port, tự động skip khi thiếu env `API_TOKEN`.
3. **Setup Installer** (In Progress): Đóng gói release folder thành `SinoMedia-Setup.exe` qua **Inno Setup**.
4. **Config UI**: Giao diện cấu hình các biến môi trường contract.
5. **Worker Control UI**: Giao diện quản trị, bật/tắt local worker, xem logs.
6. **Supabase Cloud Real Integration**: Kết nối DB cloud thật.
7. **Auto-update / Signed Installer**: Tự động cập nhật và ký bộ cài đặt.

Quyết định hiện tại:
- Desktop Runtime Package là hướng packaging chính, Inno Setup làm installer.
- Tauri/Electron chỉ xem xét sau khi phần nhân đã chạy ổn định.

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

## 2026-07-21 Addendum - Phase 2 Douyin session recovery

Douyin Phase 2 co them backlog con sau:

- Tao subsystem `crawler-pipeline/src/challenge/` de dong goi challenge provider nhu 2Captcha, timeout, polling, retry budget, va redaction.
- Tao Douyin-specific recovery trong `crawler-pipeline/src/crawl/douyin/session_recovery.ts` hoac module tuong duong. Recovery chi chay khi diagnostic tra `challenge_required`.
- Nang `runSessionDiagnostic` tu boolean sang structured result de worker biet ly do fail va khong goi moi loi la session expired.
- Sau recovery, bat buoc chay diagnostic lai; chi HTTP crawl search/detail/comment khi diagnostic pass.
- Cap nhat task metadata/log phases: `session_diagnostic`, `challenge_solving`, `session_recovered`, `collecting_posts`, `failed`.
- Them gioi han attempt/cooldown de khong dot 2Captcha balance trong loop account checkout.
- Ket noi cau hinh 2Captcha theo hai pha: env worker cho smoke test nhanh, sau do endpoint worker settings hep co scope `crawler:read_settings`.

Khong lam:

- Khong dua 2Captcha solver vao Dashboard UI runtime.
- Khong nhet solver vao moi request HTTP trong `http_client.ts`.
- Khong bien Playwright thanh crawler runtime mac dinh cho Douyin.
