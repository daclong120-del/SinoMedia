# AI Agent Workflow Configuration: Multi-Module E2E Testing (generate_road_module)

Tệp cấu hình quy trình này được thiết kế để nạp trực tiếp vào bộ kit AI Agent trên **Google Antigravity** dưới đường dẫn `.agent/workflow/generate_road_module.md`. Quy trình này điều phối AI Agent thực hiện phân tích nghiệp vụ nâng cao, thiết lập ma trận liên kết giữa các module độc lập và thiết kế kịch bản kiểm thử liên hoàn (End-to-End Business Flow) xuyên suốt chuỗi chức năng phức tạp.

---

## 1. Thông Tin Nhận Diện & Định Nghĩa (Identity & Metadata)

*   **Name:** `generate_road_module`
*   **Description:** Quy trình điều phối AI Agent phân tích luồng nghiệp vụ đi qua nhiều module (ví dụ: Đặt hàng -> Thanh toán -> Xuất kho), xây dựng ma trận phụ thuộc dữ liệu, thiết lập dữ liệu kiểm thử liên hoàn và thiết kế bộ kịch bản kiểm thử tích hợp đầu-cuối (End-to-End Testing).

---

## 2. Tham Số Đầu Vào Bắt Buộc (Input Parameters)

Để khởi chạy quy trình này, AI Agent yêu cầu người dùng cung cấp tối thiểu các thông tin đầu vào sau:

*   **`system_context` (Bối cảnh hệ thống):** Mô tả tổng quan về hệ thống phần mềm lớn (ERP, CRM, E-commerce...).
*   **`multi_module_documents` (Tài liệu các module liên quan):** Các tệp SRS hoặc tài liệu nghiệp vụ chi tiết của từng module trong chuỗi cần kiểm thử.
*   **`e2e_scenarios_scope` (Phạm vi luồng liên hoàn):** Chỉ định rõ chuỗi module cần liên kết (ví dụ: "Kiểm thử luồng đặt hàng từ lúc Khách thêm giỏ hàng cho đến khi Kho xuất hàng và đối soát ví tiền mặt").

---

## 3. Các Bước Thực Thi Chi Tiết (6-Step Workflow Process)

Quy trình sẽ tự động điều khiển AI Agent đi qua 6 bước logic chặt chẽ dưới đây:

### Bước 1: Khởi tạo bối cảnh chuỗi (Multi-Module Context Initialization)
*   **Hành động của AI:**
    1. Tiếp nhận các tài liệu đặc tả yêu cầu (`multi_module_documents`) của tất cả các module nằm trong phạm vi chỉ định.
    2. Sử dụng kỹ năng nạp bối cảnh hệ thống lớn để xác định vai trò của từng module trong chuỗi nghiệp vụ chung.
*   **Kỹ năng sử dụng:** `framework_architect` kết hợp `requirement_analy`.
*   **Kết quả đầu ra:** Xác nhận cấu trúc bối cảnh chuỗi thành công, phản hồi ngắn gọn về vai trò và mối liên hệ giữa các module.

### Bước 2: Phân tích sự phụ thuộc dữ liệu (Data Dependency Analysis)
*   **Hành động của AI:**
    1. Xác định dữ liệu đầu ra (Output Data) của module trước sẽ đóng vai trò làm dữ liệu đầu vào (Input Data) cho module sau như thế nào.
    2. Chỉ ra các điều kiện tiên quyết (Preconditions) và trạng thái dữ liệu (Data States) cần chuyển đổi khi đi từ module này sang module tiếp theo.
    3. Rà soát tài liệu đặc tả để phát hiện các lỗ hổng mâu thuẫn dữ liệu giữa các module (ví dụ: Module A định nghĩa mã đơn hàng tối đa 10 ký tự nhưng Module B đối soát ví yêu cầu mã đơn hàng tối thiểu 12 ký tự).
*   **Kỹ năng sử dụng:** `requirement_analy` (phát hiện điểm mù logic đa hệ thống).
*   **Kết quả đầu ra:** Bản báo cáo phân tích luồng dữ liệu liên thông và danh sách các điểm xung đột/điểm mù dữ liệu giữa các module.

### Bước 3: Thiết lập Ma trận Kết hợp (Combination Matrix Generation)
*   **Hành động của AI:**
    1. Xây dựng một **Ma trận kết hợp nghiệp vụ (Multi-Module Combination Matrix)** hiển thị rõ các trạng thái dữ liệu khác nhau có thể xảy ra khi luồng đi qua các module.
    2. Đề xuất các luồng rẽ nhánh tích hợp (Alternative Paths) và các luồng ngoại lệ liên hoàn (Exception Paths) có thể phát sinh trong quá trình chuyển đổi giữa các module.
*   **🛑 CHỐT CHẶN BẮT BUỘC (🛑 STOP 1 - Human-in-the-loop):**
    *   AI Agent bắt buộc phải tạm dừng (**`stop`**) tại đây.
    *   Hiển thị bảng Ma trận kết hợp nghiệp vụ sơ bộ dưới dạng Markdown.
    *   Yêu cầu người dùng review và đưa ra xác nhận phê duyệt ma trận, hoặc điều chỉnh các mối liên kết trước khi chuyển sang bước tiếp theo.

### Bước 4: Sinh bộ dữ liệu kiểm thử liên hoàn (E2E Test Data Generation)
*   **Hành động của AI:**
    1. Dựa trên Ma trận kết hợp đã được phê duyệt ở Bước 3, tính toán và sinh ra một bộ dữ liệu kiểm thử (Test Data Set) thực tế và đồng nhất xuyên suốt chuỗi luồng kiểm thử.
    2. Đảm bảo dữ liệu sinh ra không chung chung; phải ghi rõ giá trị thật (ví dụ: mã giao dịch `TXN_20260713_001`, số tiền thanh toán `500000`, trạng thái ví `ACTIVE`) để không gây nghẽn luồng do dữ liệu sai định dạng.
*   **🛑 CHỐT CHẶN BẮT BUỘC (🛑 STOP 2 - Human-in-the-loop):**
    *   AI Agent bắt buộc phải tạm dừng (**`stop`**) tại đây.
    *   Hiển thị bảng dữ liệu kiểm thử liên hoàn được thiết kế cụ thể.
    *   Chờ người dùng xác nhận tính logic của bộ dữ liệu test này.

### Bước 5: Thiết kế kịch bản kiểm thử liên thông (E2E Test Case Design)
*   **Hành động của AI:**
    1. Áp dụng kỹ năng thiết kế kịch bản kiểm thử chuyên sâu (ISTQB) để chuyển hóa ma trận và dữ liệu đã phê duyệt thành bộ kịch bản kiểm thử liên hoàn (E2E Test Case).
    2. Mỗi kịch bản bắt buộc phải đi từ điểm bắt đầu chuỗi (Module khởi đầu) qua các module trung gian cho đến điểm kết thúc (Module đầu ra).
    3. Đánh nhãn độ ưu tiên thích hợp (High/Medium/Low) dựa trên mức độ rủi ro nghiệp vụ tích hợp (Risk-Based Testing).
*   **Kỹ năng sử dụng:** `test_design` kết hợp `rbt_manual_testing`.
*   **Kết quả đầu ra:** Bộ khung 15 - 25 kịch bản tích hợp liên thông chi tiết bao phủ các luồng tích hợp thành công và các kịch bản phát hiện rủi ro tích hợp.

### Bước 6: Xuất bản và dọn dẹp (Standardize & Cleanup)
*   **Hành động của AI:**
    1. Đồng bộ và chuẩn hóa toàn bộ kịch bản, ma trận kết hợp và bộ dữ liệu vào một tệp đặc tả duy nhất định dạng Markdown (`.md`) hoặc CSV theo cấu trúc bảng đã quy định.
    2. Lưu tệp xuất ra vào thư mục chỉ định dưới dạng `road_module_e2e_test_cases.md`.
    3. Tự động dọn dẹp tất cả các tệp log tạm, file trung gian được tạo ra trong quá trình tính toán ma trận để bảo vệ tài nguyên và giữ sạch sẽ thư mục dự án.
*   **🛑 CHỐT CHẶN BẮT BUỘC (🛑 STOP 3 - Human-in-the-loop):**
    *   Dừng lại, hiển thị báo cáo tổng quan số lượng kịch bản đã sinh theo từng độ ưu tiên nghiệp vụ và đường dẫn tải file báo cáo để người dùng nghiệm thu.

---

## 4. Các Quy Tắc Ràng Buộc Nghiêm Ngặt (Mandatory Rules & Constraints)

AI Agent khi thực hiện quy trình này **bắt buộc** phải tuân thủ nghiêm ngặt các quy tắc sau:

1.  **Chốt chặn con người:** Tuyệt đối không tự ý nhảy từ Bước 3 sang Bước 5, hoặc Bước 4 sang Bước 5 nếu chưa nhận được lệnh phản hồi hoặc từ khóa *"Tiếp tục"*, *"Xác nhận"* từ người dùng.
2.  **Kháng suy diễn mơ hồ:** Các giả định và dữ liệu trung gian sinh ra khi chuyển giao trạng thái giữa các module phải dựa trên logic thực tế có thể chứng minh được từ đặc tả yêu cầu, không tự đoán mò cơ chế hệ thống.
3.  **Tiếng Việt mặc định:** Toàn bộ nội dung quy trình trao đổi, bảng ma trận kết hợp, các bước thực hiện kịch bản và kết quả mong đợi phải sử dụng **Tiếng Việt** chuẩn chuyên ngành QA/QC.
4.  **Hạt code dữ liệu:** Nghiêm cấm sử dụng các chuỗi mô tả test data chung chung. Mọi bước thao tác đều phải đi kèm dữ liệu đầu vào logic và có sự kế thừa dữ liệu ở các module sau (ví dụ: *"Nhập mã hóa đơn được sinh ra ở Bước 2 vào trường Tìm kiếm"*).

---

## 5. Mẫu Ma Trận Kết Hợp Đa Module Đầu Ra (Combination Matrix Template)

Tại Bước 3, AI Agent phải trả về bảng ma trận kết hợp định dạng Markdown chuẩn như sau:

| Luồng Liên Hoàn | Module Khởi Đầu | Module Trung Gian | Module Kết Thúc | Trạng Thái Dữ Liệu Chuyển Tiếp | Mức Độ Rủi Ro Integration | Ghi Chú |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **FLOW_01** | `Cart_Management`<br>Khách tạo đơn hàng | `Payment_Gateway`<br>Thanh toán thành công | `Inventory_Control`<br>Kho tự động xuất hàng | Đơn hàng trạng thái `PAID`<br>Mã giao dịch: `TXN_9999`<br>Số lượng trừ kho: `-1` | **High** | Luồng Happy Path cốt lõi nhất của hệ thống. |
| **FLOW_02** | `Cart_Management`<br>Khách tạo đơn hàng | `Payment_Gateway`<br>Thanh toán thất bại | `Inventory_Control`<br>Không có hành động | Đơn hàng trạng thái `FAILED`<br>Số lượng giữ kho: `Released` | **Medium** | Kiểm tra cơ chế giải phóng tồn kho khi thanh toán lỗi. |
