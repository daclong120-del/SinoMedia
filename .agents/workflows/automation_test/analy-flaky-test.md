# AI Agent Workflow: Phân Tích & Khắc Phục Flaky Test (analy_flaky_test)

Tệp cấu hình quy trình này được thiết kế để nạp vào bộ kit AI Agent trên **Google Antigravity** dưới đường dẫn `.agent/workflow/analy_flaky_test.md`. Quy trình này điều phối AI Agent tự động hóa quá trình phát hiện, phân tích nguyên nhân gốc rễ (Root Cause Analysis - RCA), tự động sửa lỗi (Self-Healing) và xác minh độ ổn định của các ca kiểm thử tự động chạy chập chờn (Flaky Tests).

---

## 1. Thông Tin Nhận Diện & Mô Tả (Identity & Description)

*   **Name:** `analy_flaky_test`
*   **Description:** Quy trình tự động phân tích lỗi, rà quét DOM thực tế, sửa đổi mã nguồn (Locator, Wait, Test Data) và chạy kiểm thử lặp lại nhiều lần để loại bỏ triệt để hiện tượng Flaky Test trong dự án Automation.

---

## 2. Tham Số Đầu Vào Bắt Buộc (Input Parameters)

Khi gọi workflow này qua câu lệnh `/analy_flaky_test`, người dùng hoặc hệ thống cần cung cấp các tham số sau:

```yaml
inputs:
  test_script_path:
    type: string
    description: "Đường dẫn đến tệp tin mã nguồn kiểm thử tự động đang bị flaky (ví dụ: src/test/java/LoginTest.java hoặc tests/login.spec.ts)"
    required: true
  failure_log:
    type: string
    description: "Nội dung log lỗi (stacktrace/failure log) ghi nhận được từ lần chạy thất bại gần nhất"
    required: true
  max_retry_reproduce:
    type: integer
    description: "Số lần chạy lại tối đa để cố gắng tái hiện hiện tượng flaky"
    default: 5
  verification_runs:
    type: integer
    description: "Số lần chạy lại liên tiếp thành công để xác minh test case đã hoàn toàn ổn định sau khi sửa"
    default: 5
  mcp_browser_enabled:
    type: boolean
    description: "Trạng thái kích hoạt MCP Browser (Playwright/Selenium) để rà quét giao diện thật"
    default: true
```

---

## 3. Quy Trình Phân Tích & Xử Lý 6 Bước (Execution Steps)

AI Agent bắt buộc phải thực hiện tuần tự theo sáu bước nghiêm ngặt dưới đây:

### Bước 1: Thu Thập Ngữ Cảnh & Phân Tích Lỗi (Context Gathering)
*   **Hành động của AI:**
    1. Đọc nội dung tệp mã nguồn kiểm thử được chỉ định tại `test_script_path`.
    2. Đọc hiểu nội dung `failure_log` để trích xuất các thông tin quan trọng:
        *   Tên phương thức kiểm thử (Test Method) bị lỗi.
        *   Dòng code chính xác gây ra lỗi (Line number).
        *   Loại ngoại lệ gặp phải (ví dụ: `TimeoutException`, `NoSuchElementException`, `ElementClickInterceptedException`, `AssertionError`...).
        *   Giá trị mong đợi (Expected) và giá trị thực tế (Actual) nếu là lỗi xác minh (Assertion).

### Bước 2: Tái Hiện Lỗi & Khảo Sát Giao Diện Thật (Reproduction & DOM Check)
*   **Hành động của AI:**
    1. Sử dụng terminal tích hợp để chạy riêng lẻ ca kiểm thử bị lỗi nhằm cố gắng tái hiện lỗi.
    2. Nếu `mcp_browser_enabled` là `true`, AI Agent bắt buộc phải mở trình duyệt thật ở chế độ có đầu (Headed Mode) thông qua MCP Browser Server để quan sát hành vi thực tế.
    3. Thực hiện rà quét cây thư mục DOM thực tế tại thời điểm xảy ra lỗi để chụp ảnh màn hình giao diện (Screenshot) và lưu lại cấu trúc HTML tĩnh nhằm phân tích xem phần tử có bị ẩn, bị che khuất hoặc chưa kịp tải hay không.

### Bước 3: Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis - RCA)
*   **Hành động của AI:** Phân loại nguyên nhân gây flaky dựa trên các kịch bản thực tế sau:
    *   **Lỗi do Locator không ổn định (Unstable Locator):** Locator sử dụng các ID động (như `id="button-12345"`, `id="button-67890"` thay đổi sau mỗi lần refresh), Class động của các UI Framework (MUI, Tailwind), hoặc dùng XPath tuyệt đối quá dài dễ vỡ khi giao diện thay đổi nhỏ.
    *   **Lỗi do Thời gian chờ không đồng bộ (Timing & Waits):** Thiếu cơ chế chờ động (Smart Waits) hoặc sử dụng thời gian chờ cứng quá ngắn (`Thread.sleep(1000)` nhưng trang mất 2 giây để tải xong dữ liệu).
    *   **Lỗi do Dữ liệu kiểm thử (Test Data Dependency):** Dữ liệu đầu vào bị trùng lặp (ví dụ: đăng ký tài khoản với email cố định `test@example.com` đã tồn tại từ lần chạy trước nên lần chạy sau bị báo lỗi trùng dữ liệu).
    *   **Lỗi do Trạng thái hệ thống (State Dependency):** Ca kiểm thử phụ thuộc vào trạng thái của một ca kiểm thử chạy trước đó (ví dụ: Test Case 2 yêu cầu phải đăng nhập từ Test Case 1, nếu Test Case 1 lỗi thì Test Case 2 lỗi theo).

### Bước 4: Đề Xuất Giải Pháp & Tự Động Sửa Lỗi (Self-Healing & Fix)
*   **Hành động của AI:** Áp dụng cơ chế Tự sửa lỗi (Self-Healing) tương ứng với nguyên nhân tìm được:
    *   *Sửa Locator:* Thay thế locator cũ bằng locator bền vững hơn theo thứ tự ưu tiên: ID tĩnh -> Role+Name (`getByRole`) -> Test ID (`data-testid`) -> Text Content -> Relative CSS/XPath bền vững.
    *   *Sửa Wait:* Thay thế toàn bộ các lệnh chờ cứng (`Thread.sleep`) bằng cơ chế chờ động thông minh (`waitForSelector`, `Locator.waitFor`, `ExpectedConditions.visibilityOfElementLocated`).
    *   *Sửa Test Data:* Tách biệt dữ liệu kiểm thử ra file cấu hình (.json, .csv) hoặc tích hợp hàm sinh chuỗi ngẫu nhiên (Randomizer/Faker) để đảm bảo tính duy nhất của dữ liệu đầu vào.
    *   *Áp dụng trực tiếp:* Cập nhật trực tiếp mã nguồn vào tệp tin `test_script_path` và các tệp Page Object liên quan.

### Bước 5: Chạy Xác Minh Nhiều Lần (Verification Run)
*   **Hành động của AI:**
    1. Chạy lại ca kiểm thử vừa sửa đơn lẻ liên tục với số lần cấu hình tại `verification_runs` (mặc định là 5 lần liên tiếp).
    2. Nếu có bất kỳ lần chạy nào bị thất bại (Fail) trong chuỗi chạy xác minh, AI Agent phải quay lại **Bước 3** để phân tích lại và đưa ra giải pháp khắc phục khác (tối đa lặp lại chu kỳ sửa lỗi 3 lần).
    3. Chỉ khi toàn bộ `verification_runs` lần chạy đều đạt trạng thái thành công (Pass), kịch bản kiểm thử mới được công nhận là đã hoàn toàn ổn định (Green & Stable).

### Bước 6: Nghiệm Thu & Cập Nhật Bài Học Kinh Nghiệm (🛑 HUMAN-IN-THE-LOOP)
*   **Hành động của AI:**
    1. **BẮT BUỘC DỪNG QUY TRÌNH (🛑 STOP):** Hiển thị báo cáo chi tiết cho người dùng bao gồm:
        *   Nguyên nhân gốc rễ gây flaky (RCA).
        *   Đoạn code/locator cũ (Before) và đoạn code/locator mới đã sửa (After) dưới dạng so sánh trực quan (git diff).
        *   Bằng chứng kết quả chạy xác minh nhiều lần thành công (Verification Logs).
    2. Chờ phản hồi xác nhận từ người dùng (`Tiếp tục` / `Xác nhận`).
    3. Khi được phê duyệt, tự động dọn dẹp các tệp tin log tạm, ảnh chụp màn hình debug thừa thãi.
    4. Trích xuất bài học kinh nghiệm và đề xuất cập nhật quy tắc chung của dự án (`project_rules.md` hoặc `manual_testing_ru.md`) để AI tránh lặp lại lỗi thiết kế tương tự trong tương lai.

---

## 4. Các Quy Tắc Ràng Buộc Nghiêm Ngặt (Mandatory Rules & Constraints)

*   **Ngôn ngữ giao tiếp:** Toàn bộ nội dung báo cáo tiến độ, log debug, giải trình nguyên nhân gốc rễ (RCA) và tương tác với người dùng bắt buộc phải sử dụng **Tiếng Việt**.
*   **Tuyệt đối cấm đoán mò (No Guessing Locator):** Khi phân tích sửa lỗi locator, AI không được tự đoán mò selector. Bắt buộc phải sử dụng MCP Browser mở trang web thật để dò quét DOM Tree thời gian thực.
*   **Ưu tiên cơ chế chờ thông minh (Smart Waits):** Nghiêm cấm tuyệt đối việc sử dụng hoặc thêm mới lệnh chờ cứng `Thread.sleep()` vào mã nguồn. Bắt buộc sử dụng cơ chế chờ động đồng bộ của framework (Playwright/Selenium).
*   **Kiểm soát số lần lặp (Retry Loop Control):** Giới hạn vòng lặp tự sửa lỗi tối đa là **3 lần**. Nếu sau 3 lần sửa và chạy lại mà test case vẫn bị flaky/fail, AI Agent phải dừng lại, báo cáo trung thực điểm nghẽn kỹ thuật và xin trợ giúp từ Senior Engineer (Human).
*   **Dọn dẹp môi trường sạch sẽ (Cleanup):** Sau khi kết thúc quy trình, bắt buộc phải tự động xóa bỏ các tệp tin log tạm, file HTML snapshot phát sinh trong quá trình debug để giữ thư mục dự án gọn gàng.
