# AI Agent Workflow Configuration: Generate Automation Test Script (generate_automation_test_script)

Tệp cấu hình quy trình (Workflow) này được thiết kế để điều phối AI Agent trên nền tảng **Google Antigravity**, tự động chuyển đổi các kịch bản kiểm thử thủ công (Manual Test Cases) có sẵn thành mã nguồn kiểm thử tự động (Automation Test Scripts) hoàn chỉnh, ổn định và sẵn sàng chạy trên CI/CD.

---

## 1. Thông Tin Nhận Diện & Mô Tả (Identity)

*   **Name:** `generate_automation_test_script`
*   **Description:** Quy trình tự động hóa 6 bước (E2E Automation Workflow) giúp điều phối và liên kết các kỹ năng của AI Agent để thiết kế kiến trúc Page Object Model (POM), rà quét giao diện (ZOM/DOM Tree) qua trình duyệt thật bằng MCP Server, sinh mã nguồn kiểm thử tự động, chuẩn bị dữ liệu và tự động sửa lỗi (Self-Healing) cho đến khi kịch bản chạy pass 100%.

---

## 2. Tham Số Đầu Vào Bắt Buộc (Required Input Parameters)

Khi gọi chạy quy trình này, người dùng cần cung cấp đầy đủ các tham số sau:

*   **`manual_test_file` (Bắt buộc):** Đường dẫn hoặc tệp đính kèm chứa danh sách kịch bản kiểm thử thủ công (định dạng `.md` hoặc `.csv`).
*   **`system_url` (Bắt buộc):** Địa chỉ URL của trang web/hệ thống cần thực hiện kiểm thử tự động.
*   **`credentials` (Bắt buộc):** Thông tin tài khoản đăng nhập (Email, Password) để AI Agent có thể truy cập vào sâu bên trong hệ thống qua các phân vùng bảo mật.
*   **`target_framework` (Bắt buộc):** Thư viện và ngôn ngữ đích mà bạn muốn sinh mã nguồn (ví dụ: `Playwright TypeScript`, `Playwright Python` hoặc `Selenium Java + TestNG`).
*   **`target_directory` (Bắt buộc):** Đường dẫn thư mục gốc của dự án code hiện tại để AI Agent ghi trực tiếp các tệp tin sinh ra vào đúng cấu trúc thư mục.

---

## 3. Liên Kết Kỹ Năng & Quy Tắc (Required Skills & Rules)

Quy trình này sẽ chủ động điều phối và tự động nạp các kỹ năng cũng như luật lệ sau trong quá trình thực thi:

*   **Kỹ năng bổ trợ bắt buộc (Skills):**
    *   `locator_analy` (Phân tích cấu trúc DOM/XML và chiến lược định vị nâng cao)
    *   `smart_locator_agent` (Đánh dấu nhãn tạm thời Red ID Mapping phục vụ tương tác thời gian thực)
    *   `qa_automation_engineer` (Kỹ sư kiểm thử tự động hóa thực chiến)
    *   `ui_debug_agent` (Điều khiển trình duyệt có đầu, chụp ảnh/quay video bằng chứng)
    *   `framework_architect` (Thiết kế cấu trúc dự án và Base classes ổn định)
*   **Quy tắc ràng buộc (Rules):**
    *   `manual_testing_ru` (Các quy tắc về dữ liệu kiểm thử cụ thể và độ bao phủ)
    *   `gemini.md` / `play_ru.md` (Quy tắc thiết kế code riêng cho từng dự án, naming convention, cấm Thread.sleep)

---

## 4. Quy Trình Thực Thi Chi Tiết 6 Bước (Execution Process)

AI Agent bắt buộc phải tuân thủ nghiêm ngặt trình tự 6 bước sau đây mà không được tự ý đi tắt đón đầu:

### Bước 1: Tiếp nhận và Phân tích Kịch bản Manual (Context & Analysis)
*   **Hành động của Agent:** Đọc hiểu kịch bản kiểm thử thủ công được cung cấp trong `manual_test_file`.
*   **Mục tiêu:** Trích xuất ra danh sách các bước thực hiện, dữ liệu kiểm thử đầu vào cần thiết, và kết quả mong đợi của từng ca kiểm thử.
*   **Gọi kỹ năng:** Nạp `qa_automation_engineer` để đánh giá xem kịch bản nào khả thi để tự động hóa, kịch bản nào cần bỏ qua (ví dụ: xác thực bên thứ ba qua OTP vật lý).

### Bước 2: Khảo Sát và Phân Tích Giao Diện Thực Tế (Real-time DOM Investigation)
*   **Hành động của Agent:** Kích hoạt MCP Browser Server (Playwright MCP hoặc Selenium MCP), khởi chạy trình duyệt thật (Headed Mode), điều hướng tới `system_url` và thực hiện đăng nhập bằng `credentials`.
*   **Mục tiêu:** Rà quét cây thư mục DOM thật của trang web để xác định chính xác locator của các phần tử cần tương tác (Form nhập liệu, nút bấm, menu...).
*   **Quy tắc nghiêm ngặt:** 
    *   **TUYỆT ĐỐI CẤM ĐOÁN MÒ LOCATOR (Zero-Guessing).** AI bắt buộc phải dựa vào snapshot DOM thực tế.
    *   Áp dụng kỹ thuật `smart_locator_agent` gán nhãn tạm thời (Red ID Mapping như `A1`, `A2`...) để tương tác thử nghiệm nhanh trong phiên debug.
    *   Ghi nhận và quy đổi sang locator tĩnh bền vững theo chiến lược ưu tiên: Static ID -> Role + Accessible Name -> Custom Test ID (`data-testid`) -> Text Content -> Relative XPath. Cấm tuyệt đối XPath tuyệt đối loằng ngoằng.
*   **Gọi kỹ năng:** `locator_analy`, `smart_locator_agent`, `ui_debug_agent`.

### Bước 3: Thiết Kế Mô Hình Code (Page Object Model Design)
*   **Hành động của Agent:** Đọc cấu trúc dự án hiện tại tại `target_directory`. Nếu dự án trống, tự động nạp `framework_architect` để dựng cấu trúc thư mục POM chuẩn hóa.
*   **Mục tiêu:** Tạo hoặc cập nhật các class Page Object (ví dụ: `LoginPage`, `CustomerPage`) tương ứng với từng trang giao diện.
*   **Quy tắc nghiêm ngặt:** 
    *   Phân tách rõ ràng: Khai báo locators và các hành động (Actions/Methods) của trang nằm hoàn toàn trong lớp Page. Không được đưa các dòng code kiểm thử (Assert) vào lớp này.
    *   Đặt tên tệp và class theo chuẩn CamelCase kết thúc bằng hậu tố `Page` (ví dụ: `LoginPage.ts` hoặc `LoginPage.java`).
*   **Gọi kỹ năng:** `framework_architect`.

### Bước 4: Chuẩn Bị và Quản Lý Dữ Liệu Kiểm Thử (Test Data Management)
*   **Hành động của Agent:** Thiết lập cơ chế quản lý dữ liệu kiểm thút tối ưu.
*   **Mục tiêu:** Tách biệt dữ liệu kiểm thử ra khỏi mã nguồn kiểm thử chính bằng cách ghi vào các tệp cấu hình trung gian (như JSON, CSV).
*   **Quy tắc nghiêm ngặt:** 
    *   Tuân thủ quy tắc `manual_testing_ru`: Không sử dụng dữ liệu chung chung.
    *   Đối với các trường dữ liệu yêu cầu tính duy nhất (như Email đăng ký, Mã khách hàng), bắt buộc phải tích hợp các hàm sinh chuỗi ngẫu nhiên (Dynamic/Random strings) hoặc hàm thời gian (Timestamp) để tránh lỗi trùng lặp khi chạy lại nhiều lần.

### Bước 5: Sinh Mã Nguồn Kiểm Thử Tự Động (Test Script Generation)
*   **Hành động của Agent:** Tạo các tệp kịch bản kiểm thử (Test Scripts) tương ứng (ví dụ: `LoginTest.ts` hoặc `LoginTest.java`).
*   **Mục tiêu:** Viết mã nguồn kịch bản kiểm thử gọi các phương thức tương tác từ lớp Page đã thiết kế ở Bước 3 và thực hiện kiểm tra kết quả (Assertions).
*   **Quy tắc nghiêm ngặt:**
    *   Đặt tên tệp và class kiểm thử kết thúc bằng hậu tố `Test`.
    *   **CẤM CỨNG việc dùng dừng luồng tĩnh `Thread.sleep()` hoặc chờ cứng vô điều kiện.** Bắt buộc phải áp dụng các cơ chế chờ thông minh và chờ động (Smart Waits / Dynamic Waits) như `waitForSelector` hoặc `Locator.waitFor` để kháng Flaky.
    *   Mỗi ca kiểm thử (Test Case) phải được ánh xạ rõ ràng với ID kịch bản manual (ví dụ: `@Test` hoặc ghi chú ghi rõ `TC_LOGIN_001`) để đảm bảo khả năng truy vết (Traceability Matrix).
*   **Gọi kỹ năng:** `qa_automation_engineer`.

### Bước 6: Thực Thi, Tự Động Sửa Lỗi (Self-Healing) và Xuất Báo Cáo
*   **Hành động của Agent:** Mở terminal của Antigravity, di chuyển vào `target_directory` và tự động thực thi lệnh chạy test thích hợp (ví dụ: `npx playwright test` hoặc `mvn clean test`).
*   **Mục tiêu:** Chạy thử nghiệm thực tế kịch bản kiểm thử vừa viết để kiểm chứng tính đúng đắn.
*   **Cơ chế tự sửa lỗi (Self-Healing):**
    *   Nếu có kịch bản bị thất bại (Fail), AI Agent bắt buộc phải tự động đọc log lỗi (Stacktrace) trong terminal, phân tích nguyên nhân (do sai locator, do thiếu wait hay do lỗi logic).
    *   AI Agent sẽ tự sửa lại mã nguồn hoặc cập nhật locator trong file Page Object và thực hiện chạy lại (Tối đa thực hiện cơ chế tự sửa lỗi này **3 lần**).
    *   Nếu sau 3 lần vẫn lỗi, AI Agent bắt buộc phải dừng lại, báo cáo chi tiết nguyên nhân lỗi và đính kèm ảnh chụp màn hình bị lỗi (On-Failure Screenshot) để con người hỗ trợ can thiệp.
*   **Xuất báo cáo:** Sau khi chạy pass toàn bộ, tự động chạy lệnh sinh báo cáo trực quan (Allure Report hoặc Playwright HTML Report), dọn dẹp các tệp log tạm thừa thãi để giữ dự án sạch sẽ và gửi liên kết báo cáo cuối cùng cho người dùng.
*   **Gọi kỹ năng:** `ui_debug_agent`, `qa_automation_engineer`.

---

## 5. Quy Tắc Giám Sát Tài Nguyên & Dọn Dẹp (Resource & Cleanup Rules)

*   **Không Chạy Song Song Quá Nhiều Trình Duyệt:** Để tránh làm tràn bộ nhớ RAM của máy tính người dùng (đặc biệt các máy cấu hình 8GB/16GB dễ bị màn hình xanh khi chạy quá tải), AI Agent chỉ được cấu hình chạy song song tối đa là **4 trình duyệt (Workers)** cùng một lúc trong quá trình debug thời gian thực.
*   **Dọn Dẹp File Rác:** Sau khi hoàn tất quy trình và xuất báo cáo thành công, AI Agent phải thực hiện lệnh dọn dẹp (cleanup) toàn bộ các tệp tin log trung gian, tệp tin nháp tạm phát sinh ngoài thư mục chỉ định để giữ cho mã nguồn trên Git luôn sạch đẹp.
*   **Tối Ưu Hóa Quota (Context Cache):** AI Agent phải liên tục tái sử dụng lại các thông tin cấu hình cũ trong phiên chat (Session cache), tránh bắt hệ thống đọc lại toàn bộ cấu trúc thư mục từ đầu để tiết kiệm tối đa lượng token tiêu thụ của tài khoản (quota).
