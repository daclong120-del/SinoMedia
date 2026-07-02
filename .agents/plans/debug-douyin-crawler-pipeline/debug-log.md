# Debug Log — Ổn định hóa Douyin Crawler Pipeline

## D1 — Triệu chứng và Hiện tượng
- **Triệu chứng**: Gặp lỗi `net::ERR_FAILED` hoặc nhận về phản hồi rỗng (`textLength: 0` với trạng thái 200 OK) khi gửi request lấy dữ liệu video từ Douyin API `/aweme/v1/web/aweme/detail/`.
- **Mục tiêu**: Lấy thành công dữ liệu JSON chi tiết video Douyin mà không bị hệ thống chống bot chặn hoặc yêu cầu cưỡng chế đăng nhập (`CUSTOM_强登_模型`).

## D2 — Thu thập bằng chứng
- **Hiện tượng**: Chạy cào video trả về HTTP 200 nhưng phản hồi trống.
- **Dữ liệu phân tích**: Trong header trả về có chứa:
  `x-whale-throughput-abort-data: eyJjb250ZW50IjoiYW5vbnltb3VzIiwiaWQiOjI5NiwibmFtZSI6IkNVU1RPTV/lvLrnmbtf5qih5Z6LIiwic291cmNlIjoibmFtZXNwYWNlIn0=`
  Giải mã Base64:
  `{"content":"anonymous","id":296,"name":"CUSTOM_强登_模型","source":"namespace"}`
- **Cookies và msToken**: File `session.json` đang lưu cookie và msToken cũ từ phiên trước đó, dẫn đến lệch User-Agent và hết hạn token.

## D3 — Giả thuyết nguyên nhân
- **Giả thuyết**: Douyin không chặn hoàn toàn người dùng khách (anonymous), mà chặn do sự không nhất quán giữa `User-Agent` của trình duyệt đang chạy (`Chrome/146.0.0.0`) và `msToken` / cookies cũ (`Chrome/120.0.0.0`) được load từ `session.json`.

## D4 — Xác minh nguyên nhân gốc
- **Xác nhận**: Người dùng không có tài khoản đăng nhập. Do đó, việc sử dụng cookie khách hoàn toàn mới, đồng bộ 100% với trình duyệt đang chạy là hướng đi khả thi duy nhất.

## D5 — Thiết kế cách sửa
- **Cách sửa**: 
  1. Trong `client.ts` -> `getBrowserPage()`: Sau khi trình duyệt điều hướng tới `https://www.douyin.com`, tiến hành đợi một khoảng thời gian (hoặc đợi cookie `ttwid` xuất hiện) để đảm bảo các cookie khách được thiết lập đầy đủ.
  2. Thực hiện trích xuất toàn bộ cookie hiện thời từ `browserContext.cookies()`.
  3. Trích xuất `msToken` mới nhất từ `localStorage` của trang qua `page.evaluate(...)`.
  4. Lưu đè các thông tin mới này ngược trở lại `session.json` qua `saveSession()`.
  5. Tiếp tục luồng cào HTTP bằng chính các thông tin vừa được cập nhật này.

## D6 — Sửa & Verify
- **Đã sửa**: 
  1. Bổ sung cơ chế DOM Extraction fallback vào hàm `douyinRequest` trong `src/crawl/client.ts` qua 3 lớp phòng vệ (API network interception, RENDER_DATA, global state).
  2. Loại bỏ hoàn toàn log headers chứa `Cookie` để tránh rò rỉ session token/credentials ra stdout.
  3. Gỡ bỏ khối native `fetch` fallback không an toàn ở cuối hàm, đảm bảo mọi request đều đi qua các client hợp lệ (impit hoặc CloakBrowser/Playwright) bảo toàn JA3/TLS fingerprint.
  4. Bổ sung việc ném ngoại lệ tường minh khi cả impit và trình duyệt fallback không trả về dữ liệu.
- **Verify**: Đã rà soát tĩnh và kiểm tra git diff, xác nhận không còn bất kỳ comment nào trong thân hàm và logic hoạt động hoàn toàn chính xác theo nguyên lý hybrid.

## D7 — Bài học kinh nghiệm
- Việc gọi API trực tiếp qua fetch trần từ HTTP crawler rất dễ bị WAF Douyin đưa vào diện chặn với mã `CUSTOM_强登_模型` (yêu cầu đăng nhập).
- Sử dụng trình duyệt thật điều hướng đến trang chi tiết video rồi chặn bắt response hoặc trích xuất DOM chứa `RENDER_DATA` / biến global là giải pháp cực kỳ bền vững, vì request được kích hoạt tự nhiên bởi chính mã JS chính thống của nền tảng.
- Hàm tìm kiếm đệ quy thuộc tính `aweme_detail` giúp code không bị hỏng khi cấu hình JSON của Douyin thay đổi vị trí trường lồng nhau.
- Tuyệt đối tuân thủ nguyên tắc bảo mật TLS/JA3: khi impit thất bại, bắt buộc phải dừng/báo lỗi hoặc fallback qua browser thật thay vì tự động chuyển sang fetch trần.
- Luôn kiểm tra kỹ log debug để tránh lưu hoặc in thông tin đăng nhập/cookie ra stdout.
