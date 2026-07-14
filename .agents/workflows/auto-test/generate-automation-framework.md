# AI Agent Workflow Configuration: Generate Automation Framework (generate_automation_framework)

Quy trình (Workflow) này được thiết kế chuẩn hóa cho AI Agent hoạt động trên nền tảng **Google Antigravity**, đóng vai trò điều phối AI tự động khởi tạo cấu trúc dự án (Framework) kiểm thử tự động trống ban đầu theo đúng công nghệ và thư viện chỉ định.

---

## 1. Thông Tin Nhận Diện (Identity & Description)

*   **Name:** `generate_automation_framework`
*   **Description:** Quy trình điều phối AI Agent tự động khởi tạo cấu trúc thư mục dự án kiểm thử tự động trống ban đầu theo mô hình Page Object Model (POM), tự động thiết lập các tệp cấu hình dependencies (Maven `pom.xml` hoặc npm `package.json`), viết sẵn các lớp cơ sở (Base Test, Base Page) hỗ trợ ThreadLocal (an toàn luồng khi chạy song song) và cơ chế chờ động (Smart Waits).

---

## 2. Tham Số Đầu Vào Bắt Buộc (Input Parameters)

Trước khi thực thi, quy trình bắt buộc phải nhận diện được các tham số đầu vào sau từ người dùng:

```markdown
- technology_stack: [Lựa chọn: Playwright TS / Selenium Java / Playwright Python]
- project_name: [Tên dự án tự động hóa]
- target_directory: [Đường dẫn thư mục gốc để khởi tạo dự án]
- build_tool: [Lựa chọn: Maven / npm / pip - Tương thích với công nghệ đã chọn]
- parallel_workers: [Số lượng luồng thực thi song song mặc định, ví dụ: 4]
```

---

## 3. Các Bước Điều Phối Quy Trình Chi Tiết (6-Step Workflow)

### Bước 1: Khởi Tạo Bối Cảnh & Nhận Diện Công Nghệ (Context & Technology Initialization)
*   **Hành động của AI:**
    1. Tiếp nhận và kiểm tra tính hợp lệ của tất cả các tham số đầu vào trong danh sách bắt buộc. Nếu thiếu tham số, **🛑 DỪNG LẠI** và yêu cầu người dùng cung cấp thêm.
    2. Tự động gọi và nạp kiến thức từ kỹ năng chuyên lập kiến trúc dự án **`framework_architect`** (`.agent/skill/framework_architect/skill.md`) để hiểu sâu cấu trúc thư mục tiêu chuẩn của công nghệ được chỉ định (`technology_stack`).
    3. Đóng vai trò là một **Senior Test Automation Architect** để lập kế hoạch dựng khung.

### Bước 2: Tạo Cấu Trúc Thư Mục Tiêu Chuẩn (Folder Structure Generation)
*   **Hành động của AI:**
    1. Di chuyển đến thư mục đích `target_directory`.
    2. Tự động khởi tạo hệ thống cây thư mục trống chuẩn hóa theo mô hình **Page Object Model (POM)**:
        *   **Thư mục Pages (Lớp Action & Locator):** Ví dụ: `src/main/java/com/project/pages/` hoặc `src/pages/`
        *   **Thư mục Tests (Kịch bản Test & Base Test):** Ví dụ: `src/test/java/com/project/tests/` hoặc `tests/`
        *   **Thư mục Utils/Helpers (Đọc file, Chụp ảnh, Ghi logs):** Ví dụ: `src/main/java/com/project/utils/` hoặc `utils/`
        *   **Thư mục Cấu hình & Dữ liệu:** `config/`, `testdata/`
        *   **Thư mục Báo cáo & Bằng chứng:** `reports/`, `evidence/`

### Bước 3: Khởi Tạo & Cấu Hình Dependencies (Configuration & Dependency Setup)
*   **Hành động của AI:**
    1. Tự động sinh tệp quản lý thư viện và cấu hình build tương thích 100% với phiên bản ổn định nhất của công nghệ được chọn:
        *   **Nếu chọn Selenium Java + Maven:** Sinh file `pom.xml` hoàn chỉnh chứa Selenium WebDriver 4.x, TestNG 7.x, Allure Reports, Log4j2, Maven Compiler và Maven Surefire Plugin cấu hình chạy song song (Thread-safe).
        *   **Nếu chọn Playwright TS + npm:** Sinh file `package.json` chứa Playwright Test, Types, Dotenv, Allure-Playwright, cùng các script chạy test chuẩn hóa (`npm run test`, `npm run report`). Sinh thêm file `playwright.config.ts` thiết lập viewport 1920x1080, headless/headed, parallel workers.
        *   **Nếu chọn Playwright Python + pip:** Sinh file `requirements.txt` chứa `pytest`, `playwright`, `pytest-xdist`, `allure-pytest`.
    2. Thiết lập tệp cấu hình môi trường `.env` hoặc `config.properties` chứa các tham số chạy toàn cục mẫu (`URL`, `Username`, `Password`, `Timeout`).

### Bước 4: Thiết Lập Chốt Chặn Phê Duyệt Cấu Hình (🛑 STOP 1 - Human-In-The-Loop)
*   **Hành động của AI:**
    1. Trình bày trực quan lên khung chat sơ đồ cây thư mục (Folder Tree) đã được khởi tạo trong thực tế.
    2. Hiển thị toàn bộ mã nguồn của tệp cấu hình dependencies chính (`pom.xml`, `package.json`, hoặc `requirements.txt`) và tệp config (`playwright.config.ts` hoặc `config.properties`).
    3. **Bắt buộc dừng lại (`stop`)** và hiển thị thông báo:
       > *"🛑 **CHỐT CHẶN 1 - PHÊ DUYỆT KIẾN TRÚC:** Tôi đã khởi tạo thành công cấu trúc thư mục dự án và các tệp cấu hình dependencies. Vui lòng rà soát lại thông tin. Gõ **'Tiếp tục'** để tôi tiến hành viết các lớp Base Page và Base Test nền tảng."*

### Bước 5: Viết Các Lớp Cơ Sở Nền Tảng (Base Classes & Base Test Generation)
*   **Hành động của AI:**
    1. Sau khi nhận được lệnh *"Tiếp tục"* từ người dùng, AI bắt đầu viết các file nền tảng cốt lõi của dự án:
        *   **Lớp BasePage (Thao tác chung):** Chứa các hàm bọc (wrapper methods) xử lý an toàn cho `click`, `type/sendKeys`, `waitForElementVisible`, `hover`, `selectDropdown` có tích hợp sẵn cơ chế **Chờ động (Smart/Dynamic Waits)** để chống Flaky Test.
        *   **Lớp BaseTest (Vòng đời chạy test):** Thiết lập các cơ chế Setup/TearDown (`@BeforeMethod`, `@AfterMethod` hoặc `@fixture`). Bắt buộc tích hợp cơ chế **ThreadLocal** (đối với Java) hoặc các cơ chế tương đương để cô lập WebDriver/BrowserContext độc lập cho từng luồng khi chạy song song, đảm bảo không bị xung đột tài nguyên.
        *   **Lớp ConfigReader (Đọc dữ liệu):** Viết mã nguồn đọc dữ liệu cấu hình từ file `.env` hoặc `properties` một cách tự động.

### Bước 6: Biên Dịch Thử, Dọn Dẹp & Nghiệm Thu (Compile, Cleanup & 🛑 STOP 2)
*   **Hành động của AI:**
    1. Tự động thực thi lệnh biên dịch dự án dưới local thông qua MCP Terminal để xác minh cấu hình dependencies hoạt động chính xác (ví dụ: chạy `mvn clean compile` hoặc `npm install && npx playwright install`).
    2. **Tự gỡ lỗi (Self-Healing):** Nếu quá trình cài đặt thư viện hoặc biên dịch thử xảy ra lỗi cú pháp hoặc thiếu dependencies, AI bắt buộc phải tự động đọc log lỗi, sửa lại code cấu hình và thực thi lại tối đa 3 lần cho đến khi thành công.
    3. **Dọn dẹp môi trường:** Tự động xóa sạch các file logs tạm, các tệp trung gian không cần thiết phát sinh trong quá trình biên dịch thử để đảm bảo mã nguồn sạch sẽ.
    4. **Báo cáo nghiệm thu (🛑 STOP 2):** Trả về báo cáo tổng kết cấu trúc dự án hoàn chỉnh và **DỪNG LẠI** thông báo hoàn thành:
       > *"🛑 **XÁC NHẬN HOÀN THÀNH:** Khung dự án tự động hóa của bạn đã được thiết lập hoàn tất, biên dịch thành công và sẵn sàng để viết Test Case. Bạn có muốn tôi hướng dẫn cách tạo kịch bản Automation đầu tiên dựa trên cấu trúc mới này không?"*

---

## 4. Các Quy Tắc Ràng Buộc Khi Thực Thi (Constraints)

*   **Ngôn ngữ bắt buộc:** Mọi ghi chú giải thích trong mã nguồn cơ sở, logs biên dịch và nội dung phản hồi trong workflow bắt buộc phải viết bằng **Tiếng Việt** chuẩn xác.
*   **Chống Flaky Test:** Nghiêm cấm AI viết mã nguồn chứa lệnh dừng luồng cứng (như `Thread.sleep()` hoặc chờ đợi tĩnh không điều kiện). Bắt buộc sử dụng cơ chế chờ động (`WebDriverWait`, `Locator.waitFor()`).
*   **An Toàn Luồng (Thread-Safety):** Kiến trúc sinh ra bắt buộc phải sẵn sàng để chạy song song. Không chấp nhận các lớp Singleton WebDriver dùng chung không an toàn cho đa luồng.
*   **Bảo Mật Thông Tin:** Tuyệt đối không hardcode các thông tin nhạy cảm vào code. Mọi thông tin tài khoản đăng nhập phải được thiết kế để đọc ra từ biến môi trường hoặc file cấu hình ẩn.
