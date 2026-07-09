# Agent Handbook

Cập nhật lần cuối: 2026-07-08  
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
- **Ràng buộc khi ghi nhận metric snapshot**: Khi thực hiện cào mới (`upsertPost`, `upsertAuthor`), bắt buộc phải dùng guard `hasRecognizedMetric` và kiểm tra độ tin cậy của metric tác giả (`fans_count !== 0`) trước khi ghi nhận snapshot, tránh tạo dữ liệu 0 giả lập (unpopulated) làm sai lệch lịch sử tăng trưởng.

## Documentation rule

Khi thay đổi hành vi:

- Cập nhật `docs/project-status.md` nếu trạng thái tính năng đổi.
- Cập nhật `docs/roadmap.md` nếu hướng đi/ưu tiên đổi.
- Cập nhật `docs/decisions.md` nếu có quyết định kiến trúc.
- Cập nhật file architecture deep dive nếu thay đổi boundary kỹ thuật.

Docs là nguồn sự thật duy nhất cho agent sau. Nếu code và docs lệch nhau, phải ghi rõ phần nào là hiện trạng code và phần nào là mục tiêu.
