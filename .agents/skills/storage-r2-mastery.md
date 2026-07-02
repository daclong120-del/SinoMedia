# Sổ Tay Nghiệp Vụ: Storage — Cloudflare R2
> Dự án: expo-supabase-ai-template | Đối tượng: Dev/Agent làm việc trực tiếp với tầng lưu trữ media
> Nguyên tắc viết: mỗi mục có **kiến thức nền**, **tình huống thực chiến**, **mẹo/tip**, **bẫy hay gặp** — không lý thuyết suông.
> Lưu ý: các con số giới hạn của R2 đã được đối chiếu với tài liệu chính thức tại thời điểm viết — vẫn nên kiểm tra lại `developers.cloudflare.com/r2` trước khi dùng để quyết định kiến trúc quan trọng.

---

## 0. Bối cảnh sử dụng R2 trong dự án
Có 2 luồng ghi dữ liệu hoàn toàn khác nhau vào R2, cần xử lý khác nhau:
- **Crawler ghi media** (video/ảnh crawl từ Douyin/TikTok...) — đây là server-to-server, crawler đã là service đáng tin cậy, dùng thẳng S3 SDK với API credentials, **không cần presigned URL**.
- **Client (Expo app) ghi/đọc media** (user upload avatar, đăng bài...) — đây là nơi bắt buộc phải dùng presigned URL, vì app mobile không bao giờ được cầm API secret key của R2.

---

## 1. Presigned URL — Upload / Download

### Kiến thức nền
- Presigned URL là 1 URL có kèm sẵn chữ ký (AWS Signature V4) cho phép thực hiện **đúng 1 thao tác** (VD: `PutObject`, `GetObject`) trên **đúng 1 object**, trong 1 khoảng thời gian giới hạn — không cần client biết API secret key.
- Presigned URL **chỉ hoạt động trên domain S3 API** (`<ACCOUNT_ID>.r2.cloudflarestorage.com`), **không hoạt động trên custom domain** (domain public bucket đang dùng để serve media qua CDN).
- R2 hỗ trợ presigned URL cho GET/PUT/HEAD... nhưng **không hỗ trợ POST dạng multipart form upload** (kiểu form HTML upload trực tiếp) — phải dùng đúng flow S3 API (PUT hoặc multipart PUT theo từng part).
- Một presigned URL hoạt động như 1 **bearer token**: ai cầm được URL đó đều thực hiện được thao tác cho tới khi hết hạn, và **có thể dùng lại nhiều lần** trong thời gian còn hiệu lực (không tự "dùng 1 lần rồi khoá").
- Giới hạn kích thước upload: 1 request PUT đơn tối đa xấp xỉ **4.995 GiB** (5 GiB trừ 5 MiB). File lớn hơn phải dùng **multipart upload**.
- Multipart upload: mỗi part tối thiểu **5 MiB** (trừ part cuối cùng), và **upload dở dang bị tự động huỷ sau 7 ngày** theo lifecycle rule mặc định — không cần tự viết job dọn rác cho phần này.

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| App cần upload video người dùng đăng (không qua crawler) | Backend (Edge Function, dùng service credentials) tạo presigned PUT URL, trả về cho app → app `PUT` thẳng file lên URL đó, **không đi qua server trung gian** (tiết kiệm băng thông/CPU server, đúng chuẩn dùng R2). |
| Video lớn (vài trăm MB) — presigned PUT 1 request duy nhất | Nếu file vượt ngưỡng hợp lý cho 1 PUT (nên chủ động giới hạn thấp hơn nhiều so với mức tối đa ~4.995 GiB để tránh timeout mạng mobile), chuyển sang **multipart upload**: khởi tạo multipart ở server (trả `uploadId`), sinh presigned URL **riêng cho từng part** (`UploadPart`), app tự upload từng phần rồi gọi API hoàn tất (`CompleteMultipartUpload`) ở server. |
| Người dùng đóng app giữa chừng khi đang upload | Với multipart: không cần lo — R2 tự huỷ upload dở dang sau 7 ngày. Với PUT đơn: cần tự xử lý — chỉ ghi record vào Postgres **sau khi** xác nhận upload thành công (qua callback hoặc `HEAD` object kiểm tra tồn tại), tránh để lại bản ghi DB trỏ tới object không tồn tại ("orphaned record"). |
| Cần giới hạn kích thước file được phép upload qua presigned URL | R2 **không có** cơ chế `content-length-range` như S3 gốc để giới hạn size ngay trong policy presigned URL. Cách xử lý thực tế: **ký (sign) luôn header `Content-Length`** khi tạo presigned URL — nếu client gửi size khác, request sẽ bị từ chối. Nếu không làm bước này, về lý thuyết ai cầm được URL có thể upload file dung lượng bất kỳ lên bucket — rủi ro chi phí lưu trữ. |
| Muốn giới hạn loại file được upload (chỉ cho phép video/ảnh) | Ký luôn header `Content-Type` vào presigned URL khi tạo — client gửi Content-Type khác với lúc ký sẽ bị từ chối. Không nên chỉ kiểm tra đuôi file ở phía app (dễ bị bypass). |
| Cần link tải video riêng tư (chưa publish, chỉ chủ sở hữu xem được) | Dùng presigned **GET** URL, thời hạn ngắn (vài phút tới vài giờ tuỳ nhu cầu). Với video **đã public** (hiển thị ngoài feed cho mọi người), **không nên dùng presigned URL** — phục vụ trực tiếp qua custom domain + CDN cache của Cloudflare để tận dụng lợi thế egress miễn phí và tốc độ cache, vì presigned URL đi qua domain S3 API sẽ không được hưởng cache CDN như custom domain. |
| Web build (Expo Web) upload thẳng từ trình duyệt bị lỗi CORS | Phải cấu hình CORS rule trên bucket R2 (allowed origin, method PUT/GET, headers) — mobile app native không cần CORS (không chạy trong browser context), nhưng nếu template hỗ trợ target Web thì đây là bước bắt buộc, hay bị quên vì test chỉ trên simulator mobile. |
| Presigned URL dùng để tạo multipart upload nhưng trả lỗi `AccessDenied` khi gọi | Lỗi phổ biến khi cố dùng presigned URL theo kiểu POST form cho multipart — R2 không hỗ trợ kiểu này. Phải đi đúng luồng: presign riêng lệnh `CreateMultipartUpload`, presign riêng từng `UploadPart`, presign (hoặc gọi trực tiếp từ server) `CompleteMultipartUpload`. |

### Mẹo / Kinh nghiệm khôn khéo
- Luôn tạo presigned URL ở **server (Edge Function)**, không bao giờ tính toán chữ ký AWS SigV4 ở phía client — làm vậy bắt buộc phải nhúng secret key vào app, tương đương lộ toàn quyền ghi/xoá bucket.
- Thời hạn presigned URL nên cân bằng: quá ngắn (vài phút) dễ fail với user mạng yếu đang upload video lớn; quá dài (nhiều giờ/ngày) tăng rủi ro nếu URL bị lộ (share nhầm, log ra ngoài...). Với upload video từ mobile, mốc 15–60 phút là hợp lý cho đa số trường hợp; hết hạn thì để app tự xin URL mới để retry thay vì cố kéo dài 1 URL sống quá lâu.
- Không log nguyên văn presigned URL vào hệ thống logging chung (Sentry, console log server) — vì nó là bearer token, lộ log = lộ quyền truy cập object đó cho tới khi hết hạn.
- Với ảnh/video công khai, thiết kế app đọc URL public trực tiếp (custom domain), **chỉ** gọi tới cơ chế presigned URL khi thật sự cần quyền truy cập giới hạn — dùng presigned URL tràn lan cho cả nội dung công khai là tự làm khó mình (tốn thêm 1 round-trip gọi server để xin URL mỗi lần cần hiển thị).

### Bẫy hay gặp
- Quên ký `Content-Length` khi tạo presigned PUT — không giới hạn được dung lượng file, dễ bị lạm dụng (vô tình hoặc cố ý) upload file khổng lồ, phát sinh chi phí lưu trữ ngoài kiểm soát.
- Dùng presigned URL cho custom domain (public bucket) — sẽ không hoạt động, vì presigned URL chỉ tương thích domain S3 API gốc của R2, không phải domain CDN tuỳ chỉnh.
- Ghi record metadata vào Postgres **ngay khi tạo** presigned URL (trước khi biết chắc client có upload thành công hay không) — dẫn tới nhiều bản ghi "ma" trỏ tới object không tồn tại nếu user huỷ giữa chừng hoặc mất mạng.

---

## 2. Cấu Trúc Bucket & Naming Convention Media

### Kiến thức nền
- Trong R2 (giống S3), "folder" **không thực sự tồn tại** — chỉ là ảo giác từ dấu `/` trong tên object key (prefix). Toàn bộ object nằm phẳng trong 1 namespace của bucket.
- Việc gắn 1 bucket với **custom domain public** sẽ khiến **toàn bộ object trong bucket đó** có thể truy cập công khai qua domain đó — R2 không có cơ chế phân quyền đọc theo từng object/prefix riêng lẻ như ACL chi tiết của S3. Đây là lý do quan trọng nhất để quyết định **tách bucket theo mức độ công khai**, không gộp chung.
- Ghi đồng thời nhiều request vào **cùng 1 key** với tần suất cao sẽ bị rate-limit (trả về lỗi 429) — cần lưu ý khi thiết kế key cho các object bị ghi/update thường xuyên.

### Đề xuất cấu trúc bucket cho dự án
| Bucket | Mục đích | Public qua custom domain? |
|---|---|---|
| `media-public` | Video/ảnh/thumbnail đã crawl và đã publish, avatar công khai | Có — phục vụ trực tiếp qua CDN, tận dụng egress miễn phí |
| `media-user-uploads` | File user tự đăng, **chưa duyệt/chưa publish** | Không — chỉ truy cập qua presigned URL |
| `media-private` | Dữ liệu nhạy cảm hơn (nếu có: tài liệu xác minh danh tính, nội dung report vi phạm...) | Không — chỉ backend/admin truy cập qua API credentials trực tiếp |

> Nguyên tắc: **không bao giờ** để 1 bucket vừa chứa nội dung riêng tư vừa gắn custom domain public — vì không có cách nào chặn riêng từng object trong bucket đó khỏi bị truy cập công khai.

### Quy ước đặt tên key (naming convention)
```
# Media đã crawl (có nguồn gốc rõ ràng theo nền tảng)
raw/{platform}/{creator_id}/{video_id}/original.mp4
raw/{platform}/{creator_id}/{video_id}/thumb_720.jpg
raw/{platform}/{creator_id}/{video_id}/thumb_360.jpg

# Media user tự upload
uploads/{user_id}/{uuid}/{sanitized_filename}

# Avatar (có versioning qua tên, không ghi đè)
avatars/{user_id}/{timestamp}-{uuid}.jpg
```

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| User đổi avatar — ghi đè lên đúng key cũ để "gọn" | **Không nên**. CDN cache của Cloudflare có độ trễ purge, ghi đè key cũ khiến user (và người khác) thấy ảnh cũ trong 1 khoảng thời gian dù đã update. Luôn tạo **key mới** (kèm timestamp/uuid) cho mỗi lần update, rồi cập nhật lại URL trong DB — tránh hoàn toàn vấn đề cache stale mà không cần gọi API purge cache thủ công. |
| Crawler crawl lại đúng 1 video đã từng crawl trước đó (trùng lặp do dữ liệu nguồn thay đổi) | Cân nhắc đặt tên key theo **hash nội dung file** (VD: SHA256 của file) thay vì chỉ dựa `video_id` từ nguồn — cho phép tự động phát hiện trùng lặp, tránh lưu 2 lần cùng 1 file vật lý dù metadata (video_id, thời điểm crawl) khác nhau. |
| Danh sách hàng triệu object dưới cùng 1 prefix (VD: toàn bộ video 1 nền tảng lớn) khiến thao tác `list` chậm | Chủ động thêm tầng phân mảnh vào key (VD: theo ngày `raw/douyin/2026/07/02/...` hoặc theo hash prefix) thay vì để phẳng toàn bộ dưới 1 prefix — giúp các thao tác liệt kê/lifecycle rule theo phạm vi nhỏ hơn, dễ quản lý và xoá theo lô hơn. |
| Cần xoá toàn bộ media của 1 nền tảng khi có yêu cầu gỡ (takedown) từ nguồn | Vì đã tổ chức key theo `{platform}/...` ngay từ đầu, có thể áp lifecycle rule hoặc script xoá theo đúng prefix đó mà không ảnh hưởng dữ liệu nền tảng khác — đây là lý do nên xác định convention key **trước khi** crawler chạy ở quy mô lớn, sửa lại sau này rất tốn công (phải migrate toàn bộ object cũ). |
| File user upload giữ nguyên tên gốc trong key (VD: `uploads/CMND_nguyen_van_a.jpg`) | Rủi ro rò rỉ thông tin cá nhân qua chính tên file (URL có thể bị lộ/log lại ở đâu đó), và rủi ro trùng tên gây ghi đè ngoài ý muốn. Luôn generate key ngẫu nhiên (UUID) cho phần định danh, tên gốc (nếu cần giữ để hiển thị) lưu riêng trong metadata DB, không dùng trực tiếp làm key. |
| Đặt Content-Type sai khi crawler upload lên R2 (thiếu, hoặc luôn để `application/octet-stream`) | Trình duyệt/app không nhận diện đúng loại file khi truy cập trực tiếp URL (không preview được ảnh/video). Luôn set `Content-Type` tường minh lúc upload (dựa vào response header thật từ nguồn hoặc suy luận từ đuôi file), đừng phó mặc cho giá trị mặc định. |

### Mẹo / Kinh nghiệm khôn khéo
- Giữ đuôi file trong key (`.mp4`, `.jpg`) dù không bắt buộc về mặt kỹ thuật — giúp debug bằng mắt thường dễ hơn nhiều và một số client/CDN vẫn dùng đuôi file như gợi ý MIME type khi header thiếu.
- Thống nhất **toàn bộ key viết thường (lowercase)** trong convention của team — R2/S3 phân biệt hoa thường, dễ tạo ra 2 key "giống nhau" nhưng thực chất khác nhau nếu không có quy ước rõ ràng.
- Với các biến thể của cùng 1 media gốc (thumbnail nhiều kích thước, bản nén preview), đặt hậu tố **dễ đoán** (`thumb_720.jpg`, `thumb_360.jpg`) để client tự suy ra URL biến thể cần thiết mà không phải query thêm DB — giảm số lần round-trip khi hiển thị feed.
- Set sẵn `Cache-Control` header hợp lý lúc upload media công khai (VD: `public, max-age=31536000, immutable` cho object không đổi vì đã dùng key versioning) — tận dụng tối đa CDN cache của Cloudflare, giảm số request thật sự chạm tới R2.

### Bẫy hay gặp
- Đặt tên bucket/key convention "tạm" lúc mới bắt đầu dự án rồi để crawler chạy ở quy mô lớn trước khi chốt convention chính thức — sửa lại sau này đồng nghĩa phải viết migration script di chuyển hàng triệu object, vừa tốn chi phí Class A operations vừa rủi ro sai sót.
- Gộp chung 1 bucket cho cả nội dung public và private rồi định "sau này" mới tách — R2 không hỗ trợ ACL theo object để vá tạm, buộc phải di chuyển dữ liệu tốn kém khi phát hiện ra vấn đề.
- Dùng ID tuần tự tăng dần (auto-increment) trực tiếp làm key cho object bị ghi/đọc với tần suất rất cao cùng lúc — nên ưu tiên UUID/hash để tránh dồn tải ghi vào cùng vùng key gần nhau.

---

## Checklist nhanh trước khi ship 1 tính năng liên quan R2
- [ ] Presigned URL được tạo ở server (Edge Function), không tính toán chữ ký ở client?
- [ ] Presigned PUT có ký kèm `Content-Length` và `Content-Type` để giới hạn size/loại file?
- [ ] Bucket chứa nội dung private có chắc chắn **không** gắn custom domain public?
- [ ] Key mới có theo đúng convention (`{loại}/{nguồn/user}/{id}/{tên}`), có phân mảnh hợp lý nếu số lượng lớn?
- [ ] Update file (avatar, media) có tạo key mới thay vì ghi đè key cũ (tránh CDN cache stale)?
- [ ] Record metadata trong Postgres chỉ được ghi **sau khi** xác nhận upload thành công, không ghi ngay lúc tạo presigned URL?
- [ ] Đã cấu hình CORS cho bucket nếu có hỗ trợ Expo Web?
- [ ] Content-Type được set tường minh lúc crawler/upload ghi object, không để mặc định?

---

*Ghi chú: sổ tay này tập trung mảng Storage/R2. Các mảng Crawler & Anti-bot, Pháp lý, DevOps sẽ là các file skill riêng tiếp theo — giữ nguyên tinh thần: kiến thức nền + tình huống thực chiến + mẹo + bẫy, không lý thuyết suông.*
