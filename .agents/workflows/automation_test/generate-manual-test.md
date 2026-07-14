# AI Agent Workflow: Risk-Based Manual Testing (generate_manual_test_RBT_6_steps)

Tệp cấu hình quy trình (Workflow) này được thiết kế chuẩn hóa cho AI Agent hoạt động trên nền tảng **Google Antigravity**, đóng vai trò là "Tổng tổng đài điều phối" kết nối các kỹ năng nghiệp vụ (**Skills**) và các quy tắc ràng buộc (**Rules**). Quy trình này thực hiện kiểm thử thủ công 6 bước dựa trên rủi ro nghiệp vụ (**RBT - Risk-Based Testing**), tích hợp chặt chẽ các chốt chặn tương tác với con người (**Human-in-the-loop**) để đảm bảo chất lượng tuyệt đối và tiết kiệm tài nguyên (quota/token) tối đa.

---

## 1. Thông Tin Nhận Diện & Mô Tả (Identity & Description)

*   **Name:** `generate_manual_test_RBT_6_steps`
*   **Description:** Quy trình tự động điều phối 6 bước thiết kế kịch bản kiểm thử thủ công dựa trên đánh giá rủi ro (AirBT), có tích hợp 3 chốt chặn bắt buộc AI dừng lại để con người review và phê duyệt.
*   **Triggers / Keywords:** `/generate_manual_test`, `/generate_manual_test_RBT_6_steps`, `/manual_test_6_steps`

---

## 2. Tham Số Đầu Vào Bắt Buộc & Tùy Chọn (Input Parameters)

AI Agent bắt buộc phải kiểm tra và xác nhận có đầy đủ các thông tin đầu vào sau đây trước khi khởi chạy quy trình. Nếu thiếu các tham số có nhãn `[Bắt buộc]`, AI phải dừng lại và yêu cầu người dùng cung cấp.

1.  **`system_context`** `[Bắt buộc]`: Bối cảnh và loại hình của hệ thống cần kiểm thử (ví dụ: CRM, E-commerce, ERP, Fintech, v.v.).
2.  **`requirement_document`** `[Bắt buộc]`: Tài liệu đặc tả yêu cầu nghiệp vụ. Có thể là file đặc tả (SRS), User Story, danh sách ticket từ Jira dạng file Markdown (`.md`), Word (`.docx`), PDF hoặc text đính kèm trực tiếp.
3.  **`mvp_scope`** `[Bắt buộc]`: Phạm vi tính năng hoặc module cụ thể cần tập trung kiểm thử trong đợt này (ví dụ: chỉ test tính năng "Đăng ký thành viên mới" hoặc "Quản lý giỏ hàng").
4.  **`ui_design`** `[Tùy chọn]`: Link thiết kế Figma, ảnh chụp màn hình giao diện thực tế (UI Screenshots) hoặc tài liệu mô tả UX/UI.
5.  **`output_format`** `[Tùy chọn - Mặc định: Markdown]`: Định dạng tệp tin kết xuất mong muốn ở bước cuối cùng (Markdown `.md`, CSV, hoặc Excel `.xlsx`).

---

## 3. Trình Tự Thực Thi Quy Trình 6 Bước Chi Tiết (SOP 6 Steps)

AI Agent bắt buộc phải thực thi tuần tự từ Bước 1 đến Bước 6, tuyệt đối không được nhảy bước hoặc tự ý gộp các bước khi chưa có sự xác nhận của người dùng.

### 🌟 BƯỚC 1: KHỞI TẠO NGỮ CẢNH (CONTEXT INITIALIZATION)
*   **Nhiệm vụ:** Nạp toàn bộ thông tin đầu vào, thiết lập bộ nhớ đệm (context memory) để AI hiểu sâu sắc về bối cảnh dự án.
*   **Hành động của AI:**
    1.  Đọc và trích xuất thông tin từ `system_context`, `requirement_document` và `mvp_scope`.
    2.  Nếu có `ui_design` (hình ảnh), tự động phân tích cấu trúc giao diện thô để ánh xạ với tài liệu nghiệp vụ.
    3.  Tự động kích hoạt vai trò (Role): **Senior Business Analyst (BA) / Senior QA Engineer** có trên 10 năm kinh nghiệm nghiệp vụ thực chiến.
    4.  Xuất thông tin xác nhận: Tóm tắt ngắn gọn bối cảnh dự án và phạm vi kiểm thử (MVP Scope) mà AI nhận diện được để người dùng kiểm tra.

### 🛑 BƯỚC 2: PHÂN TÍCH YÊU CẦU & PHÁT HIỆN ĐIỂM MÙ (REQUIREMENT ANALYSIS & Q&A)
*   **Nhiệm vụ:** Rà soát lỗ hổng logic nghiệp vụ trong tài liệu yêu cầu, đặt câu hỏi làm rõ và đưa ra các giả định hợp lý.
*   **Kỹ năng gọi ra (Skill Called):** `requirement_analy`
*   **Hành động của AI:**
    1.  Đối chiếu đặc tả yêu cầu với bộ **Checklist Điểm mù logic thường gặp** (`reference: checklist_diem_mu.md` trong thư mục `requirement_analy`).
    2.  Phát hiện các điểm mâu thuẫn, thiếu sót hoặc chưa rõ ràng trong tài liệu yêu cầu (ví dụ: thiếu ràng buộc kiểu dữ liệu, thiếu cơ chế bắt trùng lặp, logic xử lý khi lỗi chưa rõ ràng).
    3.  Tổ chức thông tin thành một bảng Q&A chuẩn hóa: Liệt kê rõ Điểm mù phát hiện, Mức độ rủi ro nghiệp vụ (High, Medium, Low), Câu hỏi Q&A dành cho BA/PO, và Giải pháp giả định nghiệp vụ đề xuất của AI để đi tiếp nếu người dùng chưa kịp trả lời.
*   **⚠️ CHỐT CHẶN SỐ 1 (HUMAN-IN-THE-LOOP - MANDATORY STOP):**
    *   **Quy định:** AI Agent **bắt buộc phải dừng lại** tại cuối bước này. Xuất bảng câu hỏi Q&A và danh sách giả định lên khung chat.
    *   **Câu lệnh dừng:** `stop` / `wait_for_user_approval`
    *   **Hành vi:** Yêu cầu người dùng (BA/QA) phản hồi làm rõ các câu hỏi hoặc xác nhận đồng ý with các giả định đề xuất. AI chỉ được chuyển sang Bước 3 sau khi người dùng gõ lệnh `"Tiếp tục"`, `"Xác nhận"`, hoặc đưa ra câu trả lời cụ thể cho các câu hỏi Q&A.

### 🌟 BƯỚC 3: PHÂN RÃ HỆ THỐNG (SYSTEM DECOMPOSITION)
*   **Nhiệm vụ:** Chia nhỏ tính năng lớn trong phạm vi MVP thành các luồng nghiệp vụ và trường hợp sử dụng con để dễ quản lý.
*   **Hành động của AI:**
    1.  Dựa trên tài liệu yêu cầu đã được làm rõ và thống nhất sau Bước 2, phân rã module cần test thành các luồng xử lý riêng biệt:
        *   **Happy Path (Luồng chính thành công):** Các trường hợp sử dụng chuẩn, hoạt động trơn tru.
        *   **Alternative Path (Luồng rẽ nhánh hợp lệ):** Các luồng nghiệp vụ rẽ nhánh nhưng vẫn hợp lệ.
        *   **Exception Path (Luồng ngoại lệ/lỗi):** Các luồng bắt lỗi hệ thống, nhập sai dữ liệu, mất kết nối, v.v.
    2.  Liệt kê cấu trúc cây phân rã tính năng (Feature Tree Decomposition) rõ ràng dưới dạng Markdown.

### 🛑 BƯỚC 4: ĐÁNH GIÁ ĐỘ BAO PHỦ & PHÂN CẤP ƯU TIÊN (RISK PRIORITIZATION & TRACEABILITY)
*   **Nhiệm vụ:** Đánh giá mức độ rủi ro nghiệp vụ của từng luồng chức năng để phân bổ nguồn lực kiểm thử và lập ma trận bao phủ (Traceability Matrix).
*   **Hành động của AI:**
    1.  Đánh giá rủi ro cho từng kịch bản chức năng đã phân rã ở Bước 3. Gán nhãn mức độ ưu tiên: **High** (Luồng cốt lõi, ảnh hưởng trực tiếp đến giao dịch/bảo mật/luồng chính), **Medium** (Luồng rẽ nhánh, chức năng phụ), hoặc **Low** (UI/UX, định dạng, các khía cạnh ít rủi ro).
    2.  Xây dựng ma trận bao phủ yêu cầu (Traceability Matrix) sơ bộ để đảm bảo mọi User Story / Requirement ID đều có ít nhất một kịch bản kiểm thử bao phủ, không bị sót yêu cầu nào của khách hàng.
*   **⚠️ CHỐT CHẶN SỐ 2 (HUMAN-IN-THE-LOOP - MANDATORY STOP):**
    *   **Quy định:** AI Agent **bắt buộc phải dừng lại** tại cuối bước này. Xuất danh sách phân rã tính năng kèm mức độ rủi ro đề xuất và bảng ma trận Traceability Matrix lên khung chat.
    *   **Câu lệnh dừng:** `stop` / `wait_for_user_approval`
    *   **Hành vi:** Yêu cầu người dùng kiểm tra danh sách kịch bản đề xuất và mức độ rủi ro. Con người có quyền yêu cầu thêm bớt kịch bản hoặc thay đổi độ ưu tiên. AI chỉ được chuyển sang Bước 5 sau khi nhận lệnh `"Xác nhận"`, `"Tiếp tục"`, hoặc ý kiến chỉnh sửa của người dùng đã được AI tiếp thu và cập nhật xong.

### 🌟 BƯỚC 5: SINH KỊCH BẢN KIỂM THỰC CHI TIẾT (DETAILED TEST CASE GENERATION)
*   **Nhiệm vụ:** Thiết kế chi tiết từng ca kiểm thử (Test Case) dựa trên danh sách kịch bản đã được phê duyệt ở Bước 4.
*   **Kỹ năng gọi ra (Skill Called):** `test_design`
*   **Hành động của AI:**
    1.  Vận dụng linh hoạt 4 kỹ thuật thiết kế kiểm thử cốt lõi (ISTQB): *Phân vùng tương đương*, *Phân tích giá trị biên*, *Bảng quyết định*, và *Chuyển đổi trạng thái* để viết chi tiết các bước.
    2.  Tự động sinh **dữ liệu kiểm thử cụ thể (Concrete Test Data)** cho từng bước, tuyệt đối tuân thủ quy tắc nghiêm cấm dữ liệu chung chung.
    3.  Tổ chức kịch bản thành bảng Markdown hoàn chỉnh theo biểu mẫu tiêu chuẩn đã quy định trong kỹ năng `test_design`.

### 🛑 BƯỚC 6: CHUẨN HÓA ĐỊNH DẠNG & EXPORT BÁO CÁO (STANDARDIZE & EXPORT)
*   **Nhiệm vụ:** Chuẩn hóa bảng kịch bản chi tiết và xuất ra tệp tin lưu trữ theo định dạng yêu cầu.
*   **Hành động của AI:**
    1.  Ánh xạ toàn bộ test case chi tiết đã sinh ở Bước 5 vào định dạng tệp tin người dùng yêu cầu ở tham số đầu vào `output_format` (mặc định là Markdown `.md`, hoặc CSV `.csv`, Excel `.xlsx`).
    2.  Đặt tên file kết xuất chuẩn hóa: `[system_context]_[mvp_scope]_manual_test_cases.[ext]` (ví dụ: `CRM_customer_management_manual_test_cases.xlsx`).
    3.  Tự động dọn dẹp các tệp log tạm, file trung gian thừa thãi phát sinh trong không gian làm việc để giữ thư mục dự án sạch sẽ.
*   **⚠️ CHỐT CHẶN SỐ 3 (HUMAN-IN-THE-LOOP - FINAL DELIVERY CONFIRMATION):**
    *   **Quy định:** AI Agent **bắt buộc phải dừng lại** sau khi đã xuất file thành công. Hiển thị đường dẫn tải file (hoặc vị trí file trong bảng Studio) kèm tóm tắt số lượng test case theo từng phân loại (High/Medium/Low, Functional/UI/Security) để người dùng review lần cuối trước khi kết thúc cuộc hội thoại.

---

## 4. Quy Tắc Hoạt Động & Giao Tiếp Tổng Quát (Rules & Constraints)

1.  **Ngôn ngữ mặc định:** Toàn bộ nội dung giao tiếp, phân tích nghiệp vụ, bảng biểu, các bước thực hiện kịch bản và kết quả mong đợi phải được diễn giải hoàn toàn bằng **Tiếng Việt** chuẩn nghiệp vụ.
2.  **Ràng buộc dừng (Stop Commands):** Từ khóa dừng `stop` trong file cấu hình này là chỉ thị tuyệt đối cho hệ thống điều phối của Google Antigravity. AI Agent không được tự ý bỏ qua hoặc chạy ngầm các bước tiếp theo khi chưa nhận được tín hiệu `"Tiếp tục"` hoặc `"Xác nhận"` của con người trong khung chat.
3.  **Tối ưu hóa Token (Quota):** Không tự ý lặp đi lặp lại việc rà quét tài liệu khi không có sự thay đổi. Luôn sử dụng bộ nhớ đệm (context cache) từ bước trước để xử lý bước sau, tránh việc nạp lại toàn bộ file tài liệu lớn từ đầu ở mỗi bước.
