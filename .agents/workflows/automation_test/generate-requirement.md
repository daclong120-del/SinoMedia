# AI Agent Workflow: Reverse Engineering Requirements (generate_requirement)

Tài liệu quy trình (Workflow) này cấu hình cho AI Agent trên **Google Antigravity** thực hiện kỹ thuật **Reverse Engineering (Kỹ nghệ đảo ngược)**. AI Agent sẽ tự động truy cập vào một ứng dụng web đang chạy thực tế (thông qua Browser/Playwright MCP), tự động rà quét giao diện và cây thư mục DOM, phân tích các luồng nghiệp vụ thực tế và viết ngược lại tài liệu đặc tả yêu cầu (Software Requirement Specification - SRS / User Story) hoàn chỉnh.

---

## 1. Thông Tin Nhận Diện (Identity)

*   **Name:** `generate_requirement`
*   **Description:** Quy trình tự động điều phối AI Agent tự khám phá giao diện ứng dụng web thực tế, phân tích cấu trúc DOM và viết ngược lại tài liệu đặc tả yêu cầu nghiệp vụ (SRS/User Story) chuẩn hóa dưới dạng Markdown.

---

## 2. Tham Số Đầu Vào Bắt Buộc (Required Input Parameters)

Khi gọi workflow `/generate_requirement`, người dùng cần cung cấp các thông tin sau:

*   `system_url` (Bắt buộc): URL của trang web/hệ thống cần khám phá và viết tài liệu.
*   `credentials` (Tùy chọn): Thông tin email, mật khẩu hoặc tài khoản đăng nhập (nếu hệ thống yêu cầu xác thực).
*   `exploration_scope` (Bắt buộc): Phạm vi hoặc module cụ thể cần tập trung viết tài liệu (ví dụ: "chỉ module Quản lý Khách hàng", "luồng Đặt hàng và Thanh toán").
*   `output_filename` (Mặc định: `requirementspec_reverse.md`): Tên file đặc tả yêu cầu Markdown đầu ra.

---

## 3. Các Kỹ Năng & Quy Tắc Liên Kết (Associated Skills & Rules)

Quy trình này sẽ chủ động phối hợp và triệu gọi các tài nguyên sau trong bộ kit `.agent`:
*   **Skills:** `requirement_analy` (Phân tích nghiệp vụ), `ui_debug_agent` (Điều khiển trình duyệt, gỡ lỗi UI), `locator_analy` (Phân tích cấu trúc DOM).
*   **Rules:** `manual_testing_ru.md` (Quy định định dạng ngôn ngữ, chống suy đoán nghiệp vụ).

---

## 4. Trình Tự Thực Hiện Chi Tiết (6 Bước Quy Trình)

AI Agent bắt buộc phải thực hiện tuần tự theo sáu bước sau đây. Tại các bước có ký hiệu **🛑 STOP**, AI Agent **bắt buộc phải dừng lại** chờ xác nhận của con người trước khi tiếp tục.

### Bước 1: Khởi Tạo Ngữ Cảnh & Đăng Nhập (Context Setup & Authentication)
1.  Đọc hiểu các tham số đầu vào (`system_url`, `credentials`, `exploration_scope`).
2.  Kích hoạt **UI Debug Agent** ở chế độ có đầu (Headed Mode) với kích thước viewport tiêu chuẩn `1920x1080`.
3.  Điều hướng tới `system_url`. 
4.  Nếu hệ thống yêu cầu đăng nhập: Sử dụng thông tin `credentials` để điền và nhấn nút đăng nhập. Nếu gặp OTP, dừng lại yêu cầu người dùng xác thực thủ công trên trình duyệt.

### Bước 2: Khám Phá UI & Phân Tích Cấu Trúc DOM (UI & DOM Exploration)
1.  Truy cập vào module tính năng được chỉ định trong `exploration_scope`.
2.  Sử dụng kỹ năng của **Locator Analyst** để quét toàn bộ cây thư mục DOM hiện tại.
3.  Liệt kê tất cả các phần tử tương tác trên màn hình (nút bấm, ô nhập liệu, bảng hiển thị, menu thả xuống, v.v.). Ghi nhận các thuộc tính như placeholder, tooltip, HTML5 validations (ví dụ: `required`, `pattern`).
4.  Thực hiện chụp ảnh màn hình giao diện tổng quan và lưu vào thư mục `evident_requirements/` làm bằng chứng đối chiếu trực quan.

### Bước 3: Ghi Nhận Luồng Nghiệp Vụ Thực Tế & Chốt Chặn Xác Nhận (Flow Mapping & Alignment)
1.  Tóm tắt các luồng hành vi của màn hình dựa trên quan sát thực tế (ví dụ: Luồng click nút Add New -> Hiện form nhập liệu; Luồng nhập sai định dạng -> Hiện validation).
2.  **🛑 STOP 1 (Human-in-the-loop):** Trình bày bảng tóm tắt các luồng nghiệp vụ phát hiện được và danh sách câu hỏi Q&A nếu có điểm chưa rõ ràng về mặt hành vi.
3.  *Yêu cầu:* **DỪNG LẠI** và yêu cầu người dùng xác nhận các luồng nghiệp vụ này đã đúng/đủ chưa. Chỉ tiếp tục bước tiếp theo khi nhận được lệnh `"Tiếp tục"`, `"Xác nhận"`, hoặc `"OK"` từ người dùng.

### Bước 4: Phân Rã & Xây Dựng Đặc Tả Chi Tiết (Detailed Requirement Drafting)
*Sau khi người dùng xác nhận Bước 3, tiến hành viết tài liệu chi tiết:*
1.  **Mô tả tổng quát (Overview):** Mục đích và vai trò của module tính năng đối với người dùng.
2.  **Bảng Đặc Tả Trường Dữ Liệu (Field Specifications):** Đối với từng form nhập liệu, liệt kê bảng chi tiết gồm: Tên trường, Kiểu dữ liệu, Giới hạn (Min/Max length), Trạng thái bắt buộc (Required), Quy tắc Validate thực tế đã quét được.
3.  **Phân rã luồng xử lý chi tiết (Flow Specifications):** Diễn giải chi tiết từng bước thực hiện cho:
    *   *Happy Path (Luồng chính thành công)*
    *   *Alternative Paths (Luồng rẽ nhánh hợp lệ)*
    *   *Exception Paths (Luồng ngoại lệ, bắt lỗi validation, thông báo lỗi cụ thể)*

### Bước 5: Định Hình Tài Liệu SRS Chuẩn Hóa (Standardization & Review)
1.  Sử dụng kỹ năng của **Requirement Analyst** để rà soát lại toàn bộ nội dung đặc tả đã viết ở Bước 4.
2.  Đối chiếu tài liệu với **Checklist Điểm mù nghiệp vụ** (ví dụ: xử lý dữ liệu trùng lặp, logic phân trang, trạng thái button khi chưa điền đủ form) để bổ sung các lưu ý nghiệp vụ quan trọng cho lập trình viên và tester về sau.
3.  **🛑 STOP 2 (Human-in-the-loop):** Trình bày bản nháp (Draft) của tài liệu đặc tả dưới định dạng Markdown chuẩn hóa và yêu cầu người dùng duyệt lại. Chỉ đi tiếp khi có lệnh xác nhận.

### Bước 6: Xuất Tài Liệu & Dọn Dẹp Môi Trường (Export & Cleanup)
1.  Xuất toàn bộ nội dung đặc tả yêu cầu đã được phê duyệt vào tệp tin chỉ định `output_filename` (định dạng `.md`) và lưu vào thư mục gốc của dự án.
2.  Chụp ảnh màn hình bước hoàn thành cuối cùng.
3.  Tiến hành **Dọn dẹp (Cleanup):** Tắt toàn bộ phiên trình duyệt, xóa các tệp tin log tạm hoặc cache sinh ra trong quá trình quét DOM để giữ thư mục dự án sạch sẽ.
4.  **🛑 STOP 3 (Wrap-up):** Thông báo hoàn thành quy trình, hiển thị đường dẫn file đặc tả yêu cầu đã xuất và tóm tắt số lượng luồng nghiệp vụ đã được tài liệu hóa thành công.

---

## 5. Quy Tắc Ràng Buộc Sống Còn (Constraints)

*   **Ngôn ngữ tài liệu:** Tài liệu SRS/User Story xuất ra bắt buộc phải viết bằng **Tiếng Việt** chuẩn nghiệp vụ phần mềm (clear, logic, không mơ hồ).
*   **Chống suy đoán (No Speculation):** Nếu gặp một tính năng bị lỗi hoặc hành vi giao diện không thống nhất trên website, AI không được tự suy đoán nghiệp vụ mà phải đưa vào danh sách câu hỏi Q&A ở Bước 3 để hỏi người dùng.
*   **Bảo vệ dữ liệu:** Nghiêm cấm AI Agent tự ý thực hiện các hành động phá hủy dữ liệu (như tự ý click nút Xóa/Delete dữ liệu hệ thống mà không có trong kịch bản yêu cầu).
