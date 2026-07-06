# Sổ Tay Nghiệp Vụ: Backend / Supabase
> Dự án: expo-supabase-ai-template | Đối tượng: Dev/Agent làm việc trực tiếp trên backend
> Nguyên tắc viết: mỗi mục có **kiến thức nền**, **tình huống thực chiến**, **mẹo/tip**, **bẫy hay gặp** — không lý thuyết suông.
> Lưu ý: các con số giới hạn (timeout, memory...) của Supabase có thể thay đổi theo thời gian — luôn đối chiếu lại `supabase.com/docs` trước khi dùng để quyết định kiến trúc quan trọng.

---

## 1. Auth Flow (Session, RLS)

### Kiến thức nền
- Supabase Auth dùng JWT: **access token** sống ngắn (mặc định ~1 giờ), **refresh token** sống dài để xin access token mới khi hết hạn.
- **RLS (Row Level Security)**: khi bật RLS trên 1 bảng, mặc định là **deny-all** — không có policy nào thì mọi truy vấn (kể cả SELECT) đều trả về rỗng, không phải lỗi.
- Phân biệt rõ 2 loại key:
  - `anon key` — dùng ở client (app di động), bị giới hạn hoàn toàn bởi RLS.
  - `service_role key` — **bỏ qua toàn bộ RLS**, chỉ được dùng ở môi trường server (Edge Functions, crawler backend). Tuyệt đối không được nhúng vào app Expo dưới bất kỳ hình thức nào (kể cả biến env "ẩn" trong bundle — bundle JS luôn có thể decompile được).
  - `authenticated` vs `anon` (role trong policy) — RLS phân biệt user đã login và guest; nếu app cho phép xem công khai không cần đăng nhập, policy phải áp dụng cho cả 2 role hoặc dùng `TO public`.
- Custom claims trong JWT (qua Auth Hooks) dùng để phân quyền kiểu role-based (admin, editor...) mà không cần query thêm bảng mỗi lần.

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| App bị đưa xuống nền (background) một thời gian, quay lại thì gọi API bị 401 | React Native không tự động refresh token khi app ở background. Bắt buộc gắn listener `AppState`: gọi `supabase.auth.startAutoRefresh()` khi app active, `stopAutoRefresh()` khi background — đây là khuyến nghị chính thức riêng cho môi trường RN, không giống web. |
| Session bị mất sau khi tắt app hoàn toàn (không phải background) | Cần storage adapter đúng khi khởi tạo Supabase client. Lưu ý: `expo-secure-store` giới hạn dung lượng ~2KB/key — JWT (đặc biệt kèm custom claims) có thể vượt giới hạn này và fail âm thầm. Với hầu hết dự án, dùng `@react-native-async-storage/async-storage` (theo khuyến nghị chính thức của Supabase cho RN) là đủ; chỉ cần SecureStore khi có yêu cầu bảo mật cao hơn kèm giải pháp chunk token. |
| Query từ app trả về mảng rỗng dù dữ liệu chắc chắn có trong DB (crawler đã ghi) | 90% là do thiếu policy SELECT cho role đang gọi (`anon`/`authenticated`), không phải bug code. Đừng đoán mò — vào Supabase SQL editor, giả lập role bằng `set role authenticated; set request.jwt.claim.sub = '<uuid>';` rồi chạy lại đúng query để xác nhận. |
| Trang cá nhân — user chỉ được thấy bookmark/danh sách riêng của mình | Policy dạng `using (auth.uid() = user_id)`. Với bảng public (video đã crawl), SELECT policy nên `using (true)` — chỉ INSERT/UPDATE/DELETE mới cần giới hạn theo quyền. |
| Đăng nhập qua Google/Apple (OAuth) trên mobile | Không dùng redirect URL kiểu web thông thường — cần `expo-auth-session` + `expo-web-browser`, đăng ký đúng redirect URI (custom scheme) trong cả `app.json` lẫn Supabase Auth settings. Thiếu 1 trong 2 nơi thì OAuth callback không bao giờ quay lại được app. |
| RLS chạy đúng nhưng query chậm dần khi bảng lớn lên (hàng triệu video/comment do crawler đổ vào) | Postgres áp dụng policy như 1 điều kiện `WHERE` ngầm trên **mọi hàng** — nếu cột dùng trong policy (`user_id`, `creator_id`...) không có index, hiệu năng sẽ giảm mạnh theo số lượng bản ghi. |
| Logout nhưng app vẫn nhận được vài event lạ (comment count tăng...) | `supabase.auth.signOut()` không tự đóng các realtime channel đang subscribe theo session cũ — phải chủ động `channel.unsubscribe()` toàn bộ trước/khi logout. |

### Mẹo / Kinh nghiệm khôn khéo
- Dùng `onAuthStateChange` làm **nguồn sự thật duy nhất** cho trạng thái auth trong app (đẩy vào Zustand/Context), không tự track object user song song bằng biến khác — tránh lệch trạng thái.
- Viết policy với `(select auth.uid())` (bọc trong subquery) thay vì gọi `auth.uid()` trực tiếp trong điều kiện — đây là khuyến nghị hiệu năng chính thức, giúp Postgres cache kết quả 1 lần (initplan) thay vì tính lại cho từng hàng.
- Luôn thêm index cho cột dùng trong RLS policy ngay từ migration tạo bảng, đừng đợi tới khi chậm mới thêm.
- Chuẩn bị sẵn 1 đoạn SQL mẫu để giả lập role/user khi debug RLS — tái sử dụng nhiều lần, đỡ dựng lại từ đầu.

### Bẫy hay gặp
- Bật RLS trong migration nhưng quên thêm policy SELECT trong **cùng** migration đó — có 1 khoảng thời gian bảng bị khoá hoàn toàn (app trắng dữ liệu) cho tới khi ai đó phát hiện.
- Nhầm giữa "không có policy" (deny-all) và "policy `using (false)`" — cả hai đều chặn nhưng ý nghĩa khác nhau khi review code; nên luôn viết policy tường minh, không dựa vào default ngầm.
- Để `service_role` key lọt vào bất kỳ file nào build chung với app client (kể cả file `.env` bị import nhầm vào bundle Expo) — đây là lỗi bảo mật nghiêm trọng nhất có thể xảy ra ở tầng backend.

---

## 2. Schema DB & Quy Ước Migration (`supabase/migrations/`)

### Kiến thức nền
- Migration của Supabase CLI là các file SQL có timestamp: `supabase/migrations/<timestamp>_<mô_tả>.sql`.
- Quy trình chuẩn: `supabase migration new <tên>` → viết SQL (hoặc sửa trực tiếp qua Supabase Studio local rồi `supabase db diff -f <tên>` để tự sinh file) → `supabase db push` lên remote.
- `supabase db reset` chạy lại **toàn bộ** migration từ đầu trên DB local — dùng để đảm bảo migration chạy được tuần tự từ số 0, không chỉ chạy được trên DB đã có sẵn schema cũ.
- Supabase CLI **không có "down migration" tự động** — muốn rollback phải tự viết migration ngược lại.

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| Thêm cột `NOT NULL` vào bảng đã có hàng triệu dòng dữ liệu (bảng `videos` do crawler đổ vào) | Không thêm `NOT NULL` trực tiếp. Chia làm 3 bước/3 migration: (1) thêm cột cho phép NULL hoặc có `DEFAULT`, (2) backfill dữ liệu cho các dòng cũ, (3) mới `ALTER COLUMN ... SET NOT NULL`. Làm gộp 1 bước dễ gây lock bảng lâu hoặc fail migration giữa chừng. |
| Cần đổi tên cột đang được app mobile ngoài production sử dụng | Không đổi tên trực tiếp rồi deploy app mới cùng lúc — app cũ vẫn nằm trên máy user chưa update, sẽ gãy ngay. Làm theo kiểu "expand-contract": thêm cột mới → migrate dữ liệu → release app đọc cột mới (fallback cột cũ) → đợi đa số user update → mới migration xoá cột cũ. |
| Nhiều dev cùng tạo migration song song, bị lệch thứ tự hoặc trùng timestamp | Luôn `git pull` + `supabase migration list` (so sánh remote vs local) trước khi tạo migration mới. Trùng timestamp hoặc áp dụng sai thứ tự gây lỗi khó debug về sau vì lịch sử schema không còn đáng tin. |
| Trạng thái video (draft/published/banned) — dùng kiểu dữ liệu gì | Với set giá trị cố định, ít đổi: `enum` hoặc `check constraint` đều ổn. Với field dễ mở rộng (loại nền tảng: douyin/tiktok/instagram... sẽ có thêm nền tảng mới), ưu tiên **bảng lookup riêng** thay vì enum — vì `ALTER TYPE ... ADD VALUE` ở Postgres có ràng buộc khi chạy trong transaction (tùy version), thêm giá trị mới có thể phức tạp hơn tưởng tượng. |
| Bảng `comments`/`video_stats` do crawler ghi liên tục, tăng trưởng cực nhanh | Cân nhắc chiến lược **partition** (theo tháng hoặc theo platform) ngay từ đầu thiết kế — thêm partition sau này vào bảng đã khổng lồ trong production là việc rất tốn công và rủi ro downtime. |
| Migration đã áp dụng lên production rồi mới phát hiện sai | Không sửa lại file migration cũ đã chạy — viết 1 migration **mới** để sửa/undo. Sửa file cũ trực tiếp gây lệch giữa checksum đã ghi nhận (`supabase_migrations.schema_migrations`) và nội dung thật, dẫn tới lỗi "drift" khó chẩn đoán giữa các môi trường. |

### Mẹo / Kinh nghiệm khôn khéo
- Ưu tiên sửa schema qua Supabase Studio (local) trước, sau đó dùng `supabase db diff -f <tên>` để tự sinh SQL — giảm lỗi cú pháp tay, đặc biệt với RLS policy phức tạp.
- Mỗi migration chỉ nên làm **một việc logic** (1 bảng, 1 thay đổi rõ ràng) — dễ review, dễ cherry-pick, dễ hiểu lại sau này khi đọc lịch sử git.
- Tách riêng `seed.sql` cho dữ liệu mẫu/dev, không lồng vào file migration — tránh nguy cơ dữ liệu test bị insert nhầm vào production khi migration chạy lại.
- Dùng Supabase Preview Branches (nếu có trong plan) để test migration trên môi trường giống production trước khi push thật — đừng biến production thành nơi phát hiện lỗi migration đầu tiên.

### Bẫy hay gặp
- Quên rằng Postgres **không tự động index cột khóa ngoại (FK)** như với primary key — bảng `comments` có `video_id` là FK nhưng không index, JOIN sẽ chậm dần khi crawler đổ hàng triệu dòng vào.
- Migration tạo bảng mới nhưng quên `ENABLE ROW LEVEL SECURITY` — bảng mới mặc định **KHÔNG bật RLS**, nghĩa là mở hoàn toàn (ngược hoàn toàn với case "quên thêm policy" ở mục 1) — đây là lỗi bảo mật nghiêm trọng dễ bị bỏ sót nhất khi thêm bảng mới.
- Chạy migration thẳng lên production mà chưa test ở staging/local `db reset` — một số lỗi (thứ tự dependency giữa các bảng, tên constraint trùng) chỉ lộ ra khi chạy migration từ đầu, không lộ ra nếu chỉ test trên DB đã có sẵn schema.

---

## 3. Edge Functions — Khi Nào Dùng, Giới Hạn Runtime

### Kiến thức nền
Edge Functions chạy trên Deno runtime, triển khai dạng serverless theo mô hình **isolate**: mỗi isolate xử lý 1 request tại 1 thời điểm, không có state/filesystem tồn tại giữa các lần gọi.

**Giới hạn thực tế cần nhớ khi thiết kế (kiểm tra lại docs vì có thể đổi theo thời gian/gói dịch vụ):**

| Giới hạn | Giá trị | Ý nghĩa thực tế |
|---|---|---|
| Wall clock (thời gian sống của 1 worker) | ~400 giây | Tổng thời gian 1 isolate được phép tồn tại, kể cả thời gian chờ I/O — vượt quá sẽ bị shutdown dù không tốn CPU. |
| CPU time / request | ~2 giây | Thời gian xử lý **thực tế trên CPU**, không tính thời gian chờ mạng/DB. Function gọi API ngoài chậm vẫn có thể ổn nếu không tính toán nặng. |
| Request idle timeout | ~150 giây | Nếu function không trả response trước mốc này → lỗi 504 Gateway Timeout. |
| Memory | ~150MB heap + ~150MB external (buffer/WASM) | Khá nhỏ so với server truyền thống — xử lý file lớn, load toàn bộ dataset vào RAM rất dễ vượt giới hạn. |
| Kích thước bundle function | ~20MB sau khi build | Import cả 1 package lớn chỉ để dùng 1 hàm nhỏ dễ chạm giới hạn này. |

Isolate có cơ chế **soft limit** (đạt ~50% tài nguyên → "nghỉ hưu": hoàn thành request hiện tại, không nhận request mới, spin isolate mới cho request tiếp theo) và **hard limit** (chạm giới hạn cứng → chấm dứt ngay lập tức, trả lỗi 546). `EdgeRuntime.waitUntil()` giữ isolate sống thêm để hoàn thành tác vụ nền sau khi đã trả response, nhưng **không kéo dài giới hạn wall-clock cứng**.

### Khi nào nên dùng Edge Functions
- Cần chạy logic với quyền `service_role` mà **tuyệt đối không được lộ ra client** — VD: sinh presigned URL upload lên Cloudflare R2, gọi API bên thứ ba có secret key.
- Xử lý webhook (thanh toán, xác thực từ bên ngoài) cần chạy phía server, có thể verify chữ ký request.
- Auth Hooks tuỳ biến (gắn thêm custom claims vào JWT trước khi phát hành).
- Tác vụ nhẹ, thời gian ngắn, không cần trạng thái dai dẳng — phù hợp là lớp "keo dán" giữa app và các service khác, không phải nơi xử lý nặng.

### Khi nào KHÔNG nên dùng Edge Functions
- **Crawl dữ liệu thật sự** (mở browser, xử lý anti-bot, xử lý hàng loạt request) — đây là lý do dự án tách riêng `crawler-pipeline` thành service độc lập (Sign Service + Crawl Workers) thay vì nhét vào Edge Functions. Chạy Playwright/CloakBrowser trong môi trường 150MB RAM, 400s wall-clock là không khả thi.
- Xử lý ảnh/video nặng (resize, transcode) — dễ chạm giới hạn CPU/memory, nên đẩy qua dịch vụ chuyên dụng hoặc xử lý ở tầng khác (crawler-pipeline, hoặc dịch vụ media riêng).
- Bất kỳ tác vụ nào cần giữ trạng thái giữa nhiều lần gọi (queue nội bộ, cache dài hạn trong RAM) — Edge Functions là stateless, cần Postgres/Redis bên ngoài cho việc này.

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| Function chạy được lúc test nhưng lâu lâu request đầu tiên (sau 1 lúc không ai gọi) bị lỗi/timeout | Cold start — isolate mới phải khởi tạo lại. Tránh `await` nặng ở top-level module (khởi tạo client, load config) — nên lazy-init bên trong handler của request để giảm thời gian khởi động. |
| Function xử lý file lớn từ Storage/R2 rồi báo lỗi hết bộ nhớ (546) | Đừng load nguyên file vào RAM (`await response.arrayBuffer()` cho file lớn) — dùng streaming để xử lý theo từng phần (chunk), hoặc đẩy việc xử lý file lớn ra ngoài Edge Function (xử lý ở crawler-pipeline hoặc dịch vụ riêng). |
| Function gọi 1 API AI/LLM bên ngoài, response cần thời gian dài (streaming) | Phải giữ isolate sống trong lúc pipe stream — theo dõi kỹ `EdgeRuntime.waitUntil()`, nhớ rằng nó không kéo dài giới hạn cứng 400s; nếu stream có thể kéo dài hơn mốc đó, cần thiết kế lại theo hướng polling thay vì giữ 1 kết nối mở xuyên suốt. |
| Function gọi function khác (chain nhiều bước xử lý) | Luôn có điều kiện dừng rõ ràng (escape condition) tự viết trong code — hệ thống có giới hạn độ sâu đệ quy nhưng không nên phụ thuộc vào giới hạn đó như 1 cơ chế an toàn chính. |
| Cần chạy tác vụ định kỳ (dọn dữ liệu cũ, tổng hợp thống kê) | Kết hợp `pg_cron` (trigger theo lịch trong Postgres) gọi Edge Function qua `pg_net`, thay vì tự dựng cron service riêng — phù hợp cho tác vụ nhẹ, không phù hợp cho job nặng/dài (vẫn bị giới hạn wall-clock). |

### Mẹo / Kinh nghiệm khôn khéo
- Function nào càng nhỏ, càng đơn năng càng tốt — chia nhỏ theo tác vụ (1 function/1 nhiệm vụ) thay vì gộp nhiều logic vào 1 function lớn, vừa dễ debug vừa tránh chạm giới hạn CPU/memory cộng dồn.
- Với tác vụ nặng hơn khả năng Edge Function, cân nhắc để chính Postgres xử lý qua database function/trigger (nếu là xử lý dữ liệu thuần), hoặc gọi ra 1 service ngoài chuyên trách (giống cách project đã tách crawler-pipeline riêng) thay vì cố nhồi vào Edge Function.
- Theo dõi log "shutdown reason" (EarlyDrop = bình thường, hết CPU/memory/wall-clock = cần tối ưu) để biết function nào đang tiệm cận giới hạn trước khi nó thật sự gãy ở production.

### Bẫy hay gặp
- Coi Edge Function như 1 server truyền thống có thể chạy tác vụ dài/nặng tuỳ ý — dẫn đến thiết kế sai ngay từ đầu, phải refactor lại kiến trúc khi gặp giới hạn ở production.
- Đặt secret key trực tiếp trong code thay vì dùng biến môi trường (secrets) của Supabase — vừa lộ key khi review code/git history, vừa khó xoay vòng (rotate) key khi cần.
- Không log đủ context khi lỗi 546/504 xảy ra — vì Edge Function không giữ state giữa các lần chạy, thiếu log ở đúng thời điểm là mất luôn manh mối debug, không "attach debugger" lại được như server truyền thống.

---

## Checklist nhanh trước khi ship 1 thay đổi Backend/Supabase
- [ ] Bảng mới có `ENABLE ROW LEVEL SECURITY` **và** đủ policy SELECT/INSERT/UPDATE cần thiết trong cùng migration?
- [ ] Cột dùng trong RLS policy và các cột FK đã có index chưa?
- [ ] Đổi tên/xoá cột đang dùng ở production có theo chiến lược "expand-contract" (không đổi + deploy app cùng lúc)?
- [ ] Migration đã test qua `supabase db reset` từ đầu (không chỉ test trên DB có sẵn schema)?
- [ ] `service_role` key có chắc chắn không lọt vào bất kỳ đâu trong bundle Expo?
- [ ] Edge Function mới có nằm trong giới hạn CPU/memory/wall-clock hiện tại, hay cần đẩy ra service riêng (như crawler-pipeline)?
- [ ] Secrets của Edge Function được set qua biến môi trường chính thức, không hardcode?
- [ ] Đã test luồng session/auth trên RN thật (app background/foreground), không chỉ test trên web?

---

*Ghi chú: sổ tay này tập trung mảng Backend/Supabase. Các mảng Storage R2, Crawler & Anti-bot, Pháp lý, DevOps sẽ là các file skill riêng tiếp theo — giữ nguyên tinh thần: kiến thức nền + tình huống thực chiến + mẹo + bẫy, không lý thuyết suông.*
