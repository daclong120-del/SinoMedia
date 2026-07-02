Dưới đây là 20 skill được nhóm theo từng mắt xích trong pipeline crawler, bám sát đúng stack của bạn (impit / CloakBrowser / Supabase / R2 / Expo).

## Nhóm 1 — Crawler Engine & Anti-detection

1. **Fingerprint Rotation** — Đồng bộ hóa JA3/TLS fingerprint (impit) với User-Agent, thứ tự header và version Chrome tương ứng, tránh mismatch giữa TLS layer và HTTP layer (lỗi phổ biến làm lộ bot).
2. **Adaptive Fetch Strategy** — Tự quyết định dùng `impit` (HTTP nhẹ) hay bật `CloakBrowser` (Playwright, tốn RAM) dựa trên mức độ JS-render và anti-bot của target, để tiết kiệm tài nguyên worker.
3. **Proxy Pool Manager** — Quản lý pool residential/datacenter: health-check, sticky session theo domain, geo-targeting, và tự động loại proxy bị ban.
4. **Challenge/CAPTCHA Handler** — Phát hiện Cloudflare Turnstile / hCaptcha / interstitial, phân luồng sang solver hoặc backoff thay vì crash cả job.
5. **Session & Cookie Persistence** — Lưu `storageState`, refresh token, giữ phiên đăng nhập qua nhiều lần chạy để không phải re-auth mỗi request.
6. **Politeness Scheduler** — Giới hạn concurrency theo từng domain, adaptive throttle theo response time, tránh trip WAF.
7. **Retry & Checkpoint Recovery** — Exponential backoff, dead-letter queue, và resume-from-checkpoint khi worker chết giữa chừng.

## Nhóm 2 — Trích xuất & Parsing

8. **Resilient Extractor** — CSS/XPath có fallback nhiều tầng + validate schema bằng Zod, cảnh báo khi selector "chết" thay vì trả về data rỗng âm thầm.
9. **Hidden-Data Parser** — Bóc dữ liệu từ `__NEXT_DATA__`, JSON-LD, Shadow DOM, lazy-load và class name random (obfuscated).
10. **Media Ingest Pipeline** — Tải ảnh/video, dedupe bằng perceptual hash, transcode và đẩy thẳng lên R2.

## Nhóm 3 — Orchestration & Data

11. **Job Queue Orchestrator** — Cron + queue (pg-boss / Supabase), phân priority, điều phối distributed workers.
12. **Incremental Crawl** — Theo dõi URL đã thấy, ETag/Last-Modified, change-detection để bỏ qua trang không đổi.
13. **Normalize & Upsert** — Canonicalize record, entity resolution, upsert idempotent vào Postgres (tránh trùng lặp).

## Nhóm 4 — Storage & Backend (Supabase + R2)

14. **R2 Uploader** — Presigned URL, SDK tương thích S3, quy ước folder + lifecycle rule, tối ưu hóa lợi thế $0 egress.
15. **Migration & RLS Author** — Sinh file migration, viết RLS policy và trigger cho các bảng dữ liệu crawl trong `supabase/migrations/`.
16. **Edge Function Ingestor** — Nhận output crawler, validate, ghi Postgres và trigger downstream ngay tại edge.

## Nhóm 5 — Observability & Chất lượng

17. **Crawl Health Monitor** — Dashboard success rate / ban rate / latency, alert khi tỉ lệ fail vượt ngưỡng (tương tự cơ chế spend-bleed alert).
18. **Data Quality Validator** — Kiểm tra completeness từng field, phát hiện anomaly và schema drift trên dữ liệu scrape được.
19. **Trace & Audit Log** — Log có cấu trúc, trace từng item xuyên suốt crawl → parse → R2 → Postgres để debug nhanh.

## Nhóm 6 — Delivery & Compliance

20. **Compliance Guardrail** — Đọc/tôn trọng robots.txt & rate limit, scrub PII trước khi lưu, gắn cờ theo jurisdiction — vừa giảm rủi ro pháp lý vừa giảm khả năng bị block dài hạn.

# Sổ Tay Nghiệp Vụ Crawler & Automation — Kiến Thức Thực Chiến

> Tài liệu tổng hợp kinh nghiệm production cho stack: `impit` (TLS/JA3 spoofing) + `CloakBrowser` (Playwright vá C++) + Supabase (Postgres/Edge Functions) + Cloudflare R2 + Expo Client.
> Trọng tâm: **tình huống thực tế → cách xử lý**, mẹo, cạm bẫy, và những lỗi âm thầm hay giết chết pipeline.

---

## 0. Ba nguyên tắc sống còn (đọc trước khi làm bất cứ gì)

**Nguyên tắc 1 — Sợ "thành công giả" hơn sợ crash.**
Lỗi tệ nhất KHÔNG phải exception. Đó là khi crawler trả `200 OK`, không lỗi, nhưng data sai âm thầm nhiều ngày/tuần. Site chống bot thông minh không block — nó **trả data giả / cache cũ / giá sai lệch nhẹ** (data poisoning) cho traffic bị nghi là bot. Người mới debug crash; người cũ debug *silent corruption*.
→ Luôn cắm **canary record**: một vài bản ghi bạn biết chắc giá trị đúng, kiểm tra mỗi lần crawl. Lệch canary = nghi bị poison hoặc site đổi layout.

**Nguyên tắc 2 — Bị nghi thì KHÔNG được retry ngay.**
`403 / 429 / 503` đột ngột → phản xạ sai là retry loop. Retry lúc bị nghi = leo thang từ soft-block (tạm) lên hard-ban IP/subnet (vĩnh viễn).
→ Quy trình đúng: **Dừng domain → Backoff → Đổi fingerprint + proxy → Test bằng IP sạch** để xác định lỗi của mình hay site đang down.

**Nguyên tắc 3 — Dùng đúng công cụ cho đúng việc (80/20).**
~80% target chỉ cần `impit` + header đúng thứ tự. Chỉ bật `CloakBrowser`/Playwright cho ~20% target khó (JS render nặng, challenge tương tác). Browser tốn CPU/RAM gấp **10–100 lần** HTTP fetch.
→ Trước khi bật browser: mở DevTools → tab **Network → Fetch/XHR**. Rất nhiều site "cần JS" thực ra có JSON API nội bộ hoặc nhúng sẵn `__NEXT_DATA__` / `__NUXT__` / Apollo state trong HTML. Cào API/JSON luôn ổn định và rẻ hơn cào DOM.

---

## 1. Anti-Detection & Fingerprinting (tầng dễ sai nhất)

### 1.1. TLS fingerprint phải KHỚP với browser bạn giả làm
`impit` cho bạn ClientHello của Chrome (JA3/JA4). Nhưng bị lộ không phải vì TLS sai, mà vì **các tầng khác không đồng bộ với TLS**:

- **HTTP/2 fingerprint (Akamai)**: thứ tự SETTINGS frame, WINDOW_UPDATE, priority — Akamai fingerprint riêng cái này. `impit` dựng TLS như Chrome nhưng nếu HTTP/2 layer khác → mismatch → lộ.
- **Thứ tự header & pseudo-header** (`:method`, `:authority`, `:scheme`, `:path`): Chrome có thứ tự cố định. Gửi header theo thứ tự của thư viện HTTP mặc định = cờ đỏ.
- **`sec-ch-ua` (Client Hints)** phải khớp version trong `User-Agent`. Khai UA Chrome 120 nhưng `sec-ch-ua` là 118 → mismatch → lộ ngay.
- **Casing header**: Chrome gửi lowercase trong HTTP/2. Viết `User-Agent` hoa/thường lung tung là dấu hiệu client tự chế.

> **Mẹo lâu năm:** JA3 giờ dễ bị giả và cũng dễ bị vượt. Nhiều WAF đã chuyển sang **JA4/JA4+** (bao gồm cả ALPN, extension). Test fingerprint của bạn ở các site như `tls.browserleaks.com`, `tls.peet.ws/api/all` trước khi tin tưởng — so sánh output với Chrome thật.

### 1.2. Bẫy "quá hoàn hảo"
Fingerprint quá sạch, quá độc nhất (unique) cũng đáng nghi ngang bot. Mục tiêu **không phải tàng hình, mà là hòa vào đám đông**. Dùng bộ fingerprint của các version Chrome/Safari phổ biến (Chrome trên Windows 10/11 chiếm phần lớn thị phần), đừng chế fingerprint lạ.

### 1.3. Dấu hiệu lộ của Playwright/headless (CloakBrowser sinh ra để vá đúng mấy cái này)
Checklist các "leak" mà anti-bot (Cloudflare, DataDome, PerimeterX/HUMAN, Kasada) soi:

- `navigator.webdriver === true` → phải patch thành `false/undefined`.
- **CDP detection**: `Runtime.enable` leak — trang phát hiện có debugger CDP đang bật. Đây là lý do CloakBrowser vá mã C++: để không lộ CDP runtime.
- `navigator.plugins` rỗng, `navigator.languages` rỗng/sai.
- **WebGL vendor/renderer** = `SwiftShader` / `Google SwiftShader` → cờ headless. Phải giả thành GPU thật (vd `ANGLE (NVIDIA...)`).
- `HeadlessChrome` trong UA (lỗi ngớ ngẩn nhưng vẫn gặp).
- Thiếu object `window.chrome`, permissions API trả kết quả không nhất quán (`Notification.permission` = 'denied' nhưng query lại ra 'prompt').
- **Canvas / AudioContext fingerprint**: nếu bạn thêm noise thì phải là noise **ổn định theo session**, KHÔNG random mỗi lần gọi. Random mỗi call = signature của anti-fingerprint tool = lộ.

> Kiểm tra nhanh mức độ tàng hình: chạy thử qua `creepjs`, `fingerprint.com/demo`, `bot.sannysoft.com`. Nếu CloakBrowser qua được creepjs mà không tụt "trust score" là ổn.

---

## 2. Proxy — nơi tiền đội nón ra đi nếu làm sai

### 2.1. Phân loại và khi nào dùng
| Loại | Đặc điểm | Dùng khi |
|---|---|---|
| **Datacenter** | Rẻ, nhanh, nhưng ASN nằm sẵn trong blocklist (MaxMind/IP2Location gắn cờ "DCH/hosting") | Target dễ, không chống bot |
| **Residential** | IP nhà dân thật, đắt | Target có anti-bot trung bình |
| **Mobile / ISP** | IP carrier, hàng nghìn user thật chung 1 IP (CGNAT) → cực khó ban | Target khó nhất; ban 1 IP = ban cả nghìn user thật nên site rất ngại ban |

### 2.2. Sai lầm kinh điển
- **Xoay proxy giữa session đang đăng nhập** → site thấy "impossible travel" (đang ở VN, request sau nhảy sang US trong 1 giây) → khóa tài khoản. Login flow phải dùng **sticky session**; chỉ rotate khi crawl ẩn danh diện rộng.
- **Không đồng bộ geo**: proxy ở Đức nhưng `Accept-Language: vi-VN`, timezone browser lại là `Asia/Ho_Chi_Minh` → mâu thuẫn. Proxy geo phải khớp Accept-Language + timezone (trong browser) + locale mong đợi của site.
- **Đấm cùng /24 subnet**: 50 IP cùng dải /24 quất 1 site → nó ban nguyên subnet, mất sạch pool. Rải đều theo subnet.
- **Tin nhà cung cấp mù quáng**: chất lượng pool khác nhau trời vực. Test pool mới trên một target anti-bot đã biết trước khi đưa vào production.

---

## 3. Rate Limit & "Lễ phép" (Politeness)

- **Concurrency thích ứng kiểu AIMD** (giống TCP congestion control): tăng dần từng bước, gặp `429/503` thì **giảm một nửa** (multiplicative decrease). Đừng set concurrency cố định.
- **Tôn trọng header `Retry-After`** — nó nói thẳng chờ bao lâu. Bỏ qua = tự chuốc ban.
- **Jitter, đừng đều tăm tắp**: request mỗi đúng 3.0s = bot lộ liễu. Traffic người là bursty và ngẫu nhiên. Random hóa khoảng nghỉ (vd 2–8s + jitter).
- **`429` nghĩa là "chậm lại", không phải "dừng"** — nhưng lặp lại `429` mà phớt lờ = leo thang thành ban IP.
- **Giới hạn concurrency theo TỪNG domain**, không phải toàn cục. Đấm 1 domain mạnh dễ trip WAF hơn là rải mỏng trên nhiều domain.

---

## 4. `impit` vs `CloakBrowser` — cây quyết định

```
Trang có trả HTML đầy đủ data khi curl không (không cần JS)?
├─ CÓ  → impit. Xong.
└─ KHÔNG → Mở DevTools > Network > XHR/Fetch. Có JSON API không?
          ├─ CÓ, API không cần token phức tạp → gọi thẳng API bằng impit (rẻ, ổn định nhất)
          ├─ CÓ nhưng API cần token/nonce do JS tính → cân nhắc reverse-engineer JS ký token, hoặc dùng browser
          └─ KHÔNG (data render client-side, có challenge tương tác) → CloakBrowser
```

**Mẹo:** Data thường nằm trong `<script id="__NEXT_DATA__">` (Next.js), `window.__NUXT__` (Nuxt), `window.__APOLLO_STATE__`, hoặc JSON-LD `<script type="application/ld+json">`. Đây là **mỏ vàng** — data đã structured sẵn, không cần parse DOM mong manh. Luôn check chỗ này TRƯỚC khi viết selector.

---

## 5. CloakBrowser / Playwright — thực chiến

### 5.1. Rò rỉ bộ nhớ sẽ giết worker của bạn
Playwright chạy lâu **rò rỉ RAM khủng khiếp**. Nguyên nhân số 1: đóng `browser` nhưng quên đóng `context`/`page`.
→ Luật: mỗi job xong phải `await context.close()`. **Recycle cả browser sau mỗi N page** (vd 50–100) dù chưa lỗi. Set memory limit cho container, tự kill + respawn khi chạm ngưỡng.

### 5.2. Đừng chờ `networkidle`
`waitForLoadState('networkidle')` là lời khuyên cũ và không đáng tin (nhiều site có long-polling/analytics chạy mãi → treo). Thay bằng `waitForSelector` cho đúng element data bạn cần. Chờ tín hiệu cụ thể, không chờ mơ hồ.

### 5.3. Chặn resource để tiết kiệm băng thông — nhưng đừng chặn nhầm
Chặn ảnh/font/video (`page.route`) để đỡ tốn proxy bandwidth là đúng. **Cạm bẫy:**
- Chặn analytics/tracking script → **cờ đỏ**. Browser thật LUÔN load analytics. Bot thì chặn để tiết kiệm → chính hành vi tiết kiệm đó tố cáo bạn.
- Chặn nhầm **script challenge của anti-bot** (Cloudflare `cdn-cgi`, DataDome) → không giải được challenge → block.
→ Whitelist cẩn thận: chặn media/font, GIỮ script của chính domain + script anti-bot + một phần analytics.

### 5.4. Site theo dõi hành vi (behavioral biometrics)
Với site khó (đặt vé, thương mại điện tử lớn): chúng track chuyển động chuột, tốc độ gõ, scroll. Nhảy thẳng đến tọa độ + click tức thì = bot.
→ Di chuột theo đường cong Bezier, thêm delay gõ phím ngẫu nhiên, scroll trước khi click. Chỉ áp dụng cho target thực sự cần — tốn effort.

---

## 6. Parsing & Extraction — bền vững hóa

- **Không bao giờ dựa vào 1 selector duy nhất.** Site A/B test layout: hôm nay bạn trúng variant B, selector trả `null`. Xây fallback nhiều tầng.
- **Ưu tiên anchor ổn định**, theo thứ tự: JSON nhúng (`__NEXT_DATA__`) > `data-testid` / `itemprop` / aria-label > cấu trúc semantic > **CSS class (tệ nhất)**. Class thường bị hash theo build (`css-1a2b3c`, `sc-bdVaJa`) — đổi mỗi lần deploy.
- **Validate bằng Zod ngay tại điểm extract.** Sai schema → **fail to lớn (fail loud)**, alert ngay. Đừng để trả `{}` âm thầm rồi ghi rác vào DB.
- **Cẩn thận locale khi parse số/ngày**: `1.000,00` (EU) vs `1,000.00` (US); ngày dd/mm vs mm/dd; timezone. Đây là nguồn bug "data đúng mà số sai" kinh điển.
- **Honeypot link**: link `display:none` mà chỉ bot mới follow → theo nó = tự gắn cờ bot. Chỉ follow link người thật thấy được.

---

## 7. Silent Failure & Data Quality — kẻ giết pipeline thầm lặng

Đây là phần quyết định pipeline "chạy được" hay "chạy đúng lâu dài". Ánh xạ tốt với tư duy *anomaly alert* mà team đã quen.

- **Canary records**: vài record giá trị đã biết, đối chiếu mỗi crawl. Lệch = nghi poison/đổi layout.
- **Row-count monitoring**: hôm qua crawl 10.000 record, hôm nay 1.200 → chắc chắn có gì đó gãy (dù không có exception).
- **Field completeness alert**: field `price` bình thường đầy 98%, hôm nay chỉ 40% có giá trị → selector giá đã chết.
- **Distribution drift**: giá trung bình nhảy 10x, hoặc toàn bộ ngày về cùng 1 giá trị → nghi poison hoặc bug parse.
- **Shadow-ban detection**: `200 OK` nhưng kết quả rỗng/nghèo nàn bất thường → bạn đang bị bóng đè, không phải site hết data.

> Quy tắc: **mọi con số bất thường phải kêu to.** Thà báo động giả còn hơn ghi rác âm thầm 2 tuần.

---

## 8. Orchestration & Queue

- **Tách 2 tầng: Discovery (tìm URL) và Extraction (cào chi tiết)** thành 2 queue riêng. Scaling khác nhau, retry logic khác nhau, dễ debug hơn nhiều.
- **Idempotency**: chạy lại job KHÔNG được nhân đôi data. Upsert theo natural key (thường là hash của URL chuẩn hóa).
- **Checkpoint & resume**: worker chết giữa chừng phải resume từ điểm dừng, không cào lại từ đầu.
- **Dead-letter queue (DLQ)**: item fail vĩnh viễn đẩy vào DLQ để review thủ công, đừng để kẹt retry vô hạn làm nghẽn queue.
- **Đừng đặt crawler trong request path.** Mọi thứ qua queue (pg-boss / Supabase queue / cron). Client không bao giờ chờ crawler real-time.

---

## 9. Supabase / Postgres — thực chiến

- **Connection pooling là bắt buộc với serverless.** Edge Functions/serverless mở connection rất nhanh làm **cạn pool** Postgres. Dùng **Supabase Pooler (pgBouncer) chế độ transaction**, không dùng direct connection cho crawler ghi ồ ạt.
- **RLS + service role**: crawler ghi bằng **service key (bypass RLS)**; client đọc qua RLS. Đừng vô tình để data cào lộ ra public — set RLS chặt cho bảng dữ liệu crawl.
- **Bulk upsert, đừng ghi từng dòng.** Row-by-row insert = chết. Dùng multi-row insert / `COPY`, batch vài trăm–nghìn dòng. Dùng `INSERT ... ON CONFLICT (natural_key) DO UPDATE` cho idempotency.
- **Index trên natural key / url_hash** để tra cứu dedup nhanh.
- **Đừng nhét blob lớn (HTML/ảnh) vào Postgres** — đó là việc của R2. Postgres chỉ lưu **reference (key/URL)** + metadata.
- **JSONB cho payload bán cấu trúc** + **generated column** cho các field bạn cần query/index. Vừa linh hoạt vừa query nhanh.
- File migration trong `supabase/migrations/`: viết cả **trigger** (vd `updated_at`, hoặc trigger đẩy notify sang Edge Function ingest) — nhưng giữ trigger nhẹ, logic nặng để ngoài.

---

## 10. Cloudflare R2 — thực chiến

- **$0 Egress là điểm mạnh — nhưng thao tác Class A (ghi) / Class B (đọc) VẪN tính tiền.** Batch và dedup để giảm số operation.
- **Content-addressable storage**: đặt key = **hash nội dung** (vd `sha256/ab/cd/abcd...jpg`). Trùng nội dung tự động dedup, không lưu lặp.
- **Perceptual hash (pHash) cho ảnh gần-trùng** (cùng ảnh khác độ nén/kích thước). Dedup ở tầng nội dung, không chỉ tầng byte.
- **Presigned URL cho client tải trực tiếp** từ R2 → tận dụng $0 egress. **Tuyệt đối đừng proxy file qua server của bạn** (làm vậy là vứt bỏ lợi thế egress miễn phí + tốn compute).
- **Set `Content-Type` đúng khi upload**, nếu không browser/Client tải về sẽ hỏng (ảnh hiện thành file rác).
- **Lifecycle rule**: raw HTML / file tạm nên tự hết hạn sau X ngày để khỏi phình storage.
- R2 không read-after-write mạnh 100% — đừng vừa ghi xong đọc lại ngay và kỳ vọng luôn có.

---

## 11. Compliance & Rủi ro (đừng bỏ qua)

- **robots.txt**: tôn trọng vừa giảm rủi ro pháp lý vừa **giảm khả năng bị ban dài hạn** (nhiều site log request vào path bị disallow để gắn cờ bot).
- **PII / dữ liệu cá nhân**: đừng lưu thứ bạn không cần. VN có **Nghị định 13/2023/NĐ-CP (PDPD)** về bảo vệ dữ liệu cá nhân; nếu chạm user quốc tế thì thêm GDPR/CCPA. Scrub PII **trước khi** ghi DB.
- **Rate limit cũng là tự bảo vệ**: đấm 1 site quá mạnh có thể cấu thành hành vi gây gián đoạn dịch vụ. Lịch sự không chỉ để tàng hình.
- ToS ≠ luật, và luật khác nhau theo vùng tài phán. Với dự án thương mại, hỏi ý kiến pháp lý cho target quan trọng — đây là ghi chú kỹ thuật, không phải tư vấn luật.

---

## 12. SỔ TAY XỬ LÝ TÌNH HUỐNG (Triage Playbook)

Phần bạn hỏi trực tiếp: **gặp X → làm Y.**

| Tình huống | Chẩn đoán nhanh | Xử lý |
|---|---|---|
| **403 tăng vọt đột ngột** | Fingerprint/proxy bị đốt, hoặc site siết WAF | KHÔNG retry. Dừng domain → backoff exponential → đổi fingerprint + proxy → test bằng 1 IP sạch xem lỗi của mình hay site-wide |
| **429 / Retry-After** | Đang quá nhanh | Giảm concurrency 1/2 (AIMD), tôn trọng `Retry-After`, thêm jitter. Nếu lặp lại nhiều → nghỉ domain lâu hơn |
| **200 OK nhưng data rỗng/nghèo** | Shadow-ban hoặc đổi layout | Diff HTML với snapshot known-good. Nếu HTML vẫn đủ mà selector trả rỗng → đổi layout (patch selector). Nếu HTML đã nghèo → shadow-ban (đổi fingerprint/proxy) |
| **CAPTCHA / Turnstile hiện ra** | Fingerprint đã bị nghi | Backoff, ĐỪNG brute-force giải mỗi request (giải liên tục = fingerprint đã cháy). Đổi fingerprint+proxy rồi thử lại; chỉ route sang solver khi thực sự cần |
| **Data trông đúng nhưng số sai/lệch** | Data poisoning HOẶC bug parse locale | Đối chiếu canary. Kiểm tra parse số/ngày/timezone/currency trước. Nếu parse đúng mà vẫn lệch → nghi bị feed data giả → đổi danh tính |
| **Playwright treo / ngốn RAM tăng dần** | Rò rỉ context/page | Timeout cứng + kill. Đảm bảo `context.close()`. Recycle browser sau N page. Đặt memory cap + auto-respawn |
| **Chạy local OK, lên prod fail** | IP prod là datacenter (bị cờ), thiếu browser deps, hoặc lộ headless | Kiểm tra ASN của IP prod; cài đủ dependency Playwright; test headless-specific leak (creepjs) |
| **Selector chết sau khi site deploy** | Class bị hash lại / đổi DOM | Zod fail loud → alert. Pin về last-known-good, chuyển sang anchor ổn định (`__NEXT_DATA__`/`data-testid`), patch |
| **Row count tụt mạnh mà không có lỗi** | Silent failure (nguy hiểm) | Coi như incident. So sánh mẫu HTML, kiểm tra field completeness, dừng ghi đè data cũ cho tới khi rõ nguyên nhân |
| **API nội bộ trả 401 dù header đủ** | Thiếu token/nonce do JS tính động | Tìm hàm JS ký request (thường trong bundle), tái tạo signature; nếu quá khó → fallback CloakBrowser lấy token rồi tái sử dụng |
| **Login liên tục bị hỏi verify / khóa** | Xoay proxy giữa session (impossible travel) | Dùng sticky session cho toàn bộ vòng đời login; giữ nguyên geo/timezone/UA suốt session |
| **Connection pool Postgres cạn** | Serverless mở quá nhiều connection | Chuyển sang Supabase Pooler (transaction mode), giảm connection/worker, batch ghi |
| **Ảnh trên Client hỏng / không tải** | Sai `Content-Type` khi upload R2, hoặc proxy sai | Set đúng Content-Type lúc upload; cho Client tải qua presigned URL trực tiếp từ R2 |
| **Chi phí R2 tăng bất thường** | Nhiều Class A/B ops, không dedup | Bật content-addressable + pHash dedup, batch upload, lifecycle xóa file tạm |

---

## 13. Checklist trước khi deploy 1 target MỚI

1. `curl` thô xem HTML có sẵn data không → nếu có, dừng ở `impit`.
2. DevTools → Network → XHR: có JSON API không? Ưu tiên gọi API.
3. Kiểm tra `__NEXT_DATA__` / JSON-LD / state nhúng.
4. Test fingerprint (`tls.peet.ws`, creepjs) nếu phải dùng browser.
5. Đọc robots.txt, xác định path nhạy cảm/honeypot.
6. Chọn loại proxy theo mức anti-bot của target; đồng bộ geo/timezone/lang.
7. Viết Zod schema + cắm canary record.
8. Set concurrency thấp lúc đầu, bật monitoring row-count & completeness.
9. Định nghĩa natural key + upsert idempotent trong migration.
10. Đặt quy ước key R2 (content-hash) + Content-Type + lifecycle.

---

*Ghi chú: Đây là kiến thức kỹ thuật vận hành, không phải tư vấn pháp lý. Với các target thương mại quan trọng, nên rà soát ToS và quy định vùng tài phán liên quan.*