# Decision Log — SinoMedia

> Lưu ý: một số quyết định cũ được ghi lại từ giai đoạn template/Expo ban đầu. Kiến trúc hiện hành được khóa trong `docs/architecture/architecture.md`; nếu có mâu thuẫn, ưu tiên tài liệu kiến trúc hiện hành.

## 2026-07-01 — Chuẩn hóa và Phân tách biến môi trường (Client & Serverless)  [initiative: refactor-env-config]
- **Bối cảnh:** Các file cấu hình môi trường `.env` và `.env.example` bị lẫn cấu hình của dự án Crawler cũ (MySQL, Redis, Proxy...). Cần làm sạch và đảm bảo an toàn bảo mật cho Client.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Tách riêng root `.env` cho Expo Client (chỉ gồm `EXPO_PUBLIC_` variables) và `supabase/.env.local` cho Edge Functions (gồm OpenAI, Cloudflare R2).
  - **Phương án B:** Gộp chung toàn bộ cấu hình sạch ở root `.env`.
  - **Phương án C:** Trả về trạng thái mặc định ban đầu chỉ có Supabase URL & Anon Key ở root.
- **Chọn Phương án A vì:** Giúp phân tách rõ ràng trách nhiệm của Client (Expo) và Serverless Backend (Edge Functions). Client chỉ tải các biến công khai cần thiết, tránh rò rỉ mã bảo mật R2/OpenAI vốn chỉ cần thực thi ở server-side.

## 2026-07-01 — Phương án Re-fetch chi tiết Video khi cào kênh Creator [initiative: feat-crawler-ts-features]
- **Bối cảnh:** Danh sách bài đăng cào từ `/aweme/v1/web/aweme/post/` của Douyin đôi khi bị thiếu link media chất lượng cao hoặc các trường chi tiết. Cần quyết định cơ chế lấy dữ liệu tối ưu.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Dùng trực tiếp dữ liệu từ danh sách bài đăng (`aweme_list`) để lưu (tiết kiệm request nhưng dễ mất dữ liệu hoặc lỗi tải media).
  - **Phương án B:** Luôn re-fetch chi tiết qua `/aweme/v1/web/aweme/detail/` cho từng video (100% đủ dữ liệu, nhưng làm tăng gấp đôi số lượng request, dễ bị chặn).
  - **Phương án C (Khuyến nghị):** Chỉ re-fetch chi tiết khi item trong danh sách thiếu thông tin media cơ bản (`video.play_addr` hoặc `images`).
- **Chọn Phương án C vì:** Cân bằng tốt nhất giữa hiệu suất cào (tránh bị Douyin rate limit do gửi quá nhiều request liên tiếp) và độ tin cậy của dữ liệu tải về.

## 2026-07-02 — Tối ưu hóa Crawler (Chặn tài nguyên, Deduplication R2, Schema Validation)  [initiative: refactor-crawler-optimization]
- **Bối cảnh:** Crawler đang tiêu thụ nhiều RAM/Proxy bandwidth do tải tài nguyên thừa, bị trùng lặp tài nguyên R2 Class A write, và thiếu tính năng phát hiện lỗi schema runtime.
- **Phương án đã cân nhắc:**
  - **Chặn tài nguyên:** Dùng Playwright `page.route` chặn image, media, font, stylesheet.
  - **Deduplication R2:** Viết hàm `checkMediaExistsInR2` sử dụng `HeadObjectCommand` check trước khi tải/upload.
  - **Validation:** Tự viết hàm kiểm tra kiểu runtime đơn giản để tránh việc cài thêm `zod` làm phình repo và rủi ro cài đặt.
- **Chọn các phương án trên vì:** Giúp crawler hoạt động hiệu quả trên VPS 2GB, tối ưu Class A/B request của Cloudflare R2 và đảm bảo fail loud khi cấu hình API thay đổi mà không làm nặng thêm dependencies.

## 2026-07-02 — Cơ chế Chống chặn Bilibili Crawler trên Windows [initiative: refactor-migrate-platforms]
- **Bối cảnh:** Bilibili API trả về lỗi `-412: request was banned` khi chạy trên Windows do thiếu spoofing JA3 từ `impit`. Cần cơ chế chống chặn ổn định.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Chỉ chạy trên Linux/Docker nơi hỗ trợ `impit` (Hạn chế dev local trên Windows).
  - **Phương án B:** Chỉ sử dụng cookie thủ công (Cookie hết hạn nhanh, dễ bị gián đoạn).
  - **Phương án C (Khuyến nghị):** Tích hợp `CloakBrowser` làm fallback client gửi request qua `page.evaluate` kèm đồng bộ cookie tự động, ưu tiên cấu hình `BILIBILI_COOKIE` từ env.
- **Chọn Phương án C vì:** Giữ tính nhất quán kiến trúc với Zhihu crawler, bảo vệ phiên đăng nhập cố định trên CI/Production và tự động hóa phục hồi phiên đăng nhập khi phát triển cục bộ trên Windows.

## 2026-07-02 — Gỡ bỏ hoàn toàn OpenAI [initiative: refactor-remove-openai]
- **Bối cảnh:** Người dùng yêu cầu loại bỏ hoàn toàn tích hợp OpenAI khỏi dự án để làm sạch codebase.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Chỉ gỡ bỏ màn hình trên client nhưng giữ lại backend Edge Functions.
  - **Phương án B (Khuyến nghị):** Gỡ bỏ triệt để cả UI client, kiểu dữ liệu, các đường dẫn liên kết, cấu hình Supabase Edge Function, biến môi trường và tài liệu dự án liên quan đến OpenAI.
- **Chọn Phương án B vì:** Đảm bảo codebase sạch sẽ nhất, không để lại code dư thừa hay các cấu hình không sử dụng gây nhầm lẫn khi phát triển tiếp.

## 2026-07-03 — Tối ưu hóa Tỷ lệ Khung hình Creative Card và Trình phát Chi tiết [initiative: refactor-creative-aspect-ratio]
- **Bối cảnh:** 
  - Giao diện lưới ban đầu hiển thị Creative Card với tỷ lệ thumbnail `aspect-[9/16]` quá dài, chiếm dụng nhiều diện tích dọc màn hình.
  - Khi xem chi tiết, trình phát video bị ép cứng vào tỷ lệ `aspect-[9/16]`, gây ra hiện tượng viền đen (letterboxing) thừa thãi ở trên/dưới cho các video dạng vuông hoặc ngang.
- **Phương án đã thực hiện:**
  - **Lưới tìm kiếm/Creative mới:** Chuyển đổi tỷ lệ thumbnail của `CreativeCard.tsx` từ `aspect-[9/16]` thành `aspect-square` (hình vuông 1:1) giúp giao diện gọn gàng, tăng mật độ thông tin. Đồng thời loại bỏ thuộc tính `poster` (vốn hiển thị ảnh tĩnh sai lệch) và thêm hậu tố `#t=0.001` vào đường dẫn video để trình duyệt tự động trích xuất frame đầu tiên làm thumbnail thực tế ngay khi vừa tải trang.
  - **Trình phát chi tiết:** Giữ nguyên khung chứa ngoài cùng có độ rộng đầy đủ (`w-full`) để đồng bộ tuyệt đối với lưới layout responsive của trang chi tiết `/dash/creative/[id]/page.tsx`. Thay vào đó, chuyển các thuộc tính thiết kế (border, shadow-xl, rounded-2xl, background đen) trực tiếp vào thẻ `<video>` hoặc `<img>` với kích thước linh hoạt `max-h-[70vh] max-w-full w-auto h-auto object-contain`. Điều này giúp đường viền và bóng đổ ôm sát hoàn hảo theo tỷ lệ gốc của video (ngang, dọc, vuông) mà không bị thừa bất kỳ dải viền đen (pillarbox/letterbox) nào, trong khi bố cục tổng thể vẫn căn lề chính xác và cân đối. Loại bỏ thuộc tính `muted` khỏi thẻ `<video>` và sử dụng `videoRef` để lập trình âm lượng 1.0 (full) và `muted = false` ngay khi tải trang chi tiết nhằm phát âm thanh mặc định theo mong muốn của user.
  - **Dữ liệu kiểm thử (Mock):** Cấu hình 3 video đầu tiên trong danh sách sử dụng các file thực tế từ `assets_test/video/BN/` (gồm 2 video vuông `AITranslator_SPY_30062026_12.mp4`, `AITranslator_SPY_30062026_92.mp4` và 1 video ngang `OlymptradeTrading_SPY_30062026_1.mp4`) để kiểm tra toàn diện khả năng thích ứng khung hình của trình phát.

## 2026-07-03 — Tối ưu hóa điều hướng chi tiết Creative qua Modal sử dụng URL Query Params [initiative: refactor-creative-modal-navigation]
- **Bối cảnh:**
  - Khi người dùng nhấn vào chi tiết một Creative, hệ thống thực hiện chuyển hướng trang hoàn toàn sang `/dash/creative/[id]`. Việc này làm mất hoàn toàn trạng thái bộ lọc (filter), vị trí cuộn trang (scroll position), từ khóa tìm kiếm (search queries) và số trang hiện tại (pagination). Khi quay lại trang tìm kiếm, người dùng phải tải lại từ đầu gây lag và trải nghiệm không liền mạch.
- **Phương án đã thực hiện:**
  - **Tách component dùng chung:** Trích xuất toàn bộ giao diện và logic hiển thị chi tiết Creative thành component `CreativeDetailView.tsx`. Component này nhận vào `id`, cờ `isModal`, và các callback điều hướng (`onClose`, `onNavigate`).
  - **Tích hợp Modal-based Navigation:** Thay vì điều hướng cứng bằng Link, khi nhấp vào một CreativeCard trên trang Tìm kiếm (`search`) hoặc Creative Mới (`new`), ứng dụng sẽ cập nhật URL một cách nhẹ nhàng (shallow push) thêm tham số `?viewId=CR-XXX` thông qua `router.push(..., { scroll: false })`. Cờ `{ scroll: false }` ngăn chặn trình duyệt tự động cuộn lên đầu trang, duy trì vị trí cuộn hiện tại của danh sách.
  - **Đồng bộ trạng thái:** Cả hai trang `search` và `new` giám sát sự thay đổi của tham số `viewId` trong URL để render Modal `CreativeDetailView` lồng đè lên giao diện hiện tại mà không unmount trang cha. Nhờ đó, tất cả trạng thái tìm kiếm, phân trang và cuộn trang đều được bảo toàn 100%. Khi tắt modal, tham số `viewId` được xóa khỏi URL để trở lại trạng thái ban đầu. Đường dẫn URL này cũng hoàn toàn có thể bookmark/chia sẻ trực tiếp vì nếu truy cập trực tiếp bằng đường dẫn chứa `viewId`, modal sẽ tự động mở sẵn.
  - **Soft-navigation trong Modal:** Khi nhấn vào các nút tương tác chuyển tiếp sang Creative khác nằm trong Modal, Modal sẽ thực hiện cập nhật mềm `viewId` lên URL thay vì chuyển hướng cứng, đảm bảo luồng trải nghiệm cực kỳ mượt mà và nhanh chóng.
  - **Tối ưu hóa trang chi tiết độc lập:** Đơn giản hóa trang chi tiết cũ `/dash/creative/[id]/page.tsx` thành một trang chứa nhẹ nhàng gọi trực tiếp `CreativeDetailView` với cờ `isModal={false}`. Điều này giúp loại bỏ hoàn toàn việc lặp mã và đảm bảo tính nhất quán giao diện giữa chế độ Modal và chế độ Trang độc lập.

## 2026-07-03 — Tối ưu hóa tải dữ liệu (Lazy Loading & Metadata Preload) bảo vệ tài nguyên Server [initiative: refactor-creative-load-optimization]
- **Bối cảnh:**
  - Trang danh sách hiển thị 60 creative một lần (pageSize = 60). Nếu tải trước toàn bộ dữ liệu chi tiết, các creative tương tự, hoặc stream video cho cả 60 item cùng một lúc sẽ gây quá tải nặng cho server và tiêu tốn băng thông cực lớn của khách hàng.
- **Phương án đã thực hiện:**
  - **Tách biệt dữ liệu Danh sách & Chi tiết (Lazy Loading):** 
    - Lưới danh sách bên ngoài chỉ render các dữ liệu cơ bản (id, title, cover_url, metrics tổng quan).
    - Component `CreativeDetailView` chỉ được render và mount khi người dùng click vào card (khi URL xuất hiện `viewId`). 
    - Vì thế, việc truy vấn dữ liệu chi tiết nâng cao (bảng phân tích tần suất, tag chi tiết, các creative tương tự) hoàn toàn chạy theo cơ chế "on-demand" (chỉ gọi khi cần) cho đúng 1 creative duy nhất được mở.
  - **Tải trước video tối giản (Metadata Preload):**
    - Đặt thuộc tính `preload="metadata"` cho thẻ `<video>` ở các card trong danh sách. 
    - Trình duyệt chỉ gửi request lấy vài KB đầu tiên để trích xuất tỷ lệ khung hình và ảnh thumbnail ban đầu mà không stream toàn bộ file video.
    - Video đầy đủ chỉ thực sự được stream khi người dùng di chuột vào card (hover to play) hoặc nhấp mở chi tiết.
  - **Phân trang độc lập:** Khi chuyển sang trang kế tiếp, hệ thống chỉ gọi lại API danh sách để lấy 60 item mới dạng thu gọn chứ tuyệt đối không preload bất kỳ thông tin chi tiết nào.

## 2026-07-03 — Schema Update cho Task Metadata và Cấu hình Nâng cao [initiative: feat-crawler-task-metadata]
- **Bối cảnh:** Cần bổ sung các cấu hình nâng cao cho Crawler Task (Tags, Ngôn ngữ, Chế độ headless, cào bình luận, bình luận phụ) từ Dashboard xuống Database và Queue Worker.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Thêm từng cột tương ứng (`tags`, `language`, `crawl_comments`, `crawl_sub_comments`, `headless`) vào bảng `crawler_tasks`. (Ưu: Kiểu dữ liệu tường minh; Nhược: Làm phình cấu trúc bảng, khó mở rộng thêm các tùy chọn crawler trong tương lai).
  - **Phương án B (Khuyến nghị):** Thêm một cột JSONB duy nhất `metadata` mặc định `'{}'` vào bảng `crawler_tasks` để chứa tất cả cấu hình động. Với bảng dữ liệu bài viết cào được (`crawled_posts`), thêm 2 cột tường minh `tags text[]` và `language text` để phục vụ lọc/truy vấn tốc độ cao tại Creative Hub.
- **Chọn Phương án B vì:** Đạt sự cân bằng tối đa giữa khả năng mở rộng linh hoạt của Task (JSONB chứa vô số cấu hình crawler động mà không lo sửa đổi DDL liên tục) và hiệu năng tìm kiếm ở lớp Creative Hub (sử dụng cột mảng `tags text[]` và index của PostgreSQL để lọc bài đăng cực nhanh).

## 2026-07-06 — Thiết kế Tag Input dạng Chip có hỗ trợ Paste Hàng Loạt [initiative: feat-crawler-task-metadata]
- **Bối cảnh:** Cần thiết kế giao diện nhập tags cho nhiệm vụ cào bài viết trong Modal tạo task của Dashboard.
- **Phương án đã cân nhắc:**
  - **Phương án A:** Ô nhập văn bản dạng chuỗi đơn giản, phân tách bằng dấu phẩy (Comma-separated text input). (Ưu: Đơn giản, code nhanh; Nhược: Dễ sai sót định dạng dữ liệu, rác khoảng trắng dư thừa trong DB).
  - **Phương án B (Khuyến nghị):** Tag Input dạng chip tương tác, tự động parse chuỗi dán từ clipboard (onPaste) theo regex phân tách và hiển thị dưới dạng các thẻ chip riêng biệt.
- **Chọn Phương án B vì:** Đảm bảo tính toàn vẹn của dữ liệu (data integrity) tránh các tag rỗng hoặc trùng lặp, đồng thời tối ưu hóa trải nghiệm người dùng với khả năng copy-paste nhanh danh sách nhiều tag cùng một lúc mà không đánh mất tốc độ nhập liệu.

## 2026-07-06 — Thiết kế Chiến Lược Lưu Trữ Dữ Liệu Client (Client Storage Strategy) [initiative: refactor-client-storage]
- **Bối cảnh:** Dashboard Next.js đang lưu JWT token mặc định trong localStorage (qua `@supabase/supabase-js`), chưa cấu hình CSRF protection, chưa cấu hình Zustand persist versioning, và chưa có IndexedDB để xử lý dữ liệu nhập liệu lớn mà không block UI main thread.
- **Phương án đã cân nhắc:**
  - **Auth Token (JWT):** Chọn lưu trong Cookie httpOnly với `@supabase/ssr` thay vì localStorage để bảo vệ trước XSS. Chọn cấu hình `SameSite=Lax` thay vì `Strict` để giữ cho Google OAuth redirect hoạt động trơn tru từ trang của Supabase, kết hợp với kiểm tra `Origin`/`Referer` headers tại các API Route Handler nhận request POST/PUT/DELETE từ client nhằm chống CSRF.
  - **Zustand UI Preferences:** Chọn dùng Zustand persist có cấu hình `version` và hàm `migrate` rõ ràng (Schema Versioning & Migration) để ngăn chặn crash runtime khi thay đổi store schema, kết hợp inline script ở `<head>` để parse JSON từ key store nhằm chống flicker dark mode.
  - **IndexedDB cho Dữ liệu lớn:** Chọn dùng IndexedDB thông qua thư viện `idb-keyval` (không đồng bộ, dung lượng lớn) thay vì localStorage cho danh sách proxy/link KOL lớn, kết hợp debounce ghi (~500ms) và bọc try-catch graceful fallback (in-memory + Toast UI) để xử lý việc Safari Private Browsing chặn ghi đĩa.
- **Chọn các phương án trên vì:** Giải quyết toàn diện các lỗ hổng bảo mật kinh điển, bảo vệ hiệu năng mượt mà của UI (chống flicker, non-blocking main thread) và xử lý triệt để các edge cases thực tế như Safari Private Browsing và tính tương thích ngược của local state.

## 2026-07-06 — Kiến trúc Data Access Layer: Repository + Service Pattern [initiative: refactor-data-access-layer]
- **Bối cảnh:** Dashboard có 3 kiểu truy vấn DB song song (supabase singleton, SSR client, HTTP fetch), 3 supabase client files cùng tồn tại, 896 dòng api.ts monolith, 597 dòng mock-data fallback che lỗi. 18 page đều là "use client" gọi DB trực tiếp.
- **Phương án đã cân nhắc:**
  - **A. Repository + Service Pattern (khuyến nghị):** Repo = lớp duy nhất chạm DB (1 file/entity), Service = business logic compose nhiều repo. Server Components gọi Service. API Route cũng gọi Service.
  - **B. tRPC / Server Actions thuần:** Type-safe end-to-end, nhưng phải setup thêm dependency mới, learning curve cao cho dự án đang chạy.
  - **C. Giữ nguyên api.ts, chỉ dọn dẹp:** Ít rủi ro nhất nhưng không giải quyết gốc vấn đề coupling.
- **Chọn A vì:** Chuẩn doanh nghiệp, Next.js 14+ khuyến nghị Server Components + server-side data fetching. Repository testable (inject SupabaseClient). Không thêm dependency mới. Chia 4 phase giảm rủi ro.

## 2026-07-06 — Phase 1 giữ nguyên api.ts + mock-data.ts [initiative: refactor-data-access-layer]
- **Bối cảnh:** 18 page "use client" đang import trực tiếp từ `lib/api.ts` và `lib/mock-data.ts`. Xoá ngay sẽ vỡ toàn bộ app.
- **Quyết định:** Phase 1 chỉ TẠO repositories + services MỚI song song. api.ts, supabase.ts singleton, và mock-data.ts giữ nguyên. Phase 2 mới migrate page → xoá hết.
- **Lý do:** Giảm blast radius — Phase 1 không phá gì cả, chỉ thêm code mới. Nếu lỗi, rollback = xoá thư mục repositories/ và services/.

## 2026-07-06 — Realtime tách riêng lib/realtime/ [initiative: refactor-data-access-layer]
- **Bối cảnh:** Supabase Realtime (postgres_changes) bắt buộc chạy trên browser client. Nếu xoá browser singleton sẽ mất realtime.
- **Quyết định:** Tạo `lib/realtime/subscriptions.ts` — file DUY NHẤT import `createClientBrowser()`. Tất cả phần còn lại đều dùng server client.
- **Lý do:** Tách rõ concern. Dễ audit "đâu dùng browser client" — chỉ 1 file duy nhất.

## 2026-07-06 — Tái Cấu Trúc Lớp Xác Thực: Server Actions + Service Pattern [initiative: refactor-auth-layer]
- **Bối cảnh:** Luồng đăng ký (Sign Up) và đăng nhập (Login) hiện tại đang gọi trực tiếp `@supabase/supabase-js` ở Client Component. Code xử lý turnstile simulation, bypass offline mode, và quản lý cookie (mock session) bị trộn lẫn trong UI Form, không an toàn và khó bảo trì.
- **Phương án đã cân nhắc:**
  - **Phương án A (Khuyến nghị):** Đưa toàn bộ logic Auth (signIn, signUp, offline ping, mock session) lên Server thông qua `AuthService` và `auth.actions.ts`. Client chỉ gửi dữ liệu thô và nhận phản hồi UI.
  - **Phương án B:** Chỉ chuyển luồng Đăng nhập, giữ nguyên luồng Đăng ký ở Client để xử lý Captcha/Turnstile trực tiếp.
- **Chọn Phương án A vì:** 
  - Đảm bảo an toàn bảo mật tuyệt đối: Cookie xác thực mock được ghi bằng HTTP Response Header (`cookies()`) thay vì `document.cookie` ở browser.
  - Tách biệt hoàn toàn mã UI khỏi mã logic Supabase, làm cho UI Form cực kỳ ngắn gọn, dễ đọc và dễ bảo trì (đúng theo mô hình Controller - Service của NestJS mà user tham khảo).
  - Quản lý tập trung mọi trạng thái bypass và kiểm soát lỗi từ API Supabase.
