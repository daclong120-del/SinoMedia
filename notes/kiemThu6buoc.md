Dựa trên các tài liệu hướng dẫn từ nguồn tài liệu của bạn, quy trình xây dựng và thực hiện một chương trình kiểm thử (test case) bằng công cụ AI Agent trên Google Antigravity được chia làm hai lộ trình toàn diện, mỗi lộ trình gồm **6 bước chặt chẽ**: **Quy trình kiểm thử Manual (Thủ công)** và **Quy trình kiểm thử Automation (Tự động)**. 

Dưới đây là chi tiết các bước thực hiện cho từng quy trình:

---

### I. Quy trình Kiểm thử Manual (RBT - Risk-Based Testing 6 bước)
Quy trình này tập trung vào việc đọc hiểu tài liệu, phân tích nghiệp vụ, tìm lỗi logic và sinh bộ test case thủ công hoàn chỉnh. Điểm cốt lõi là luôn có sự can thiệp và xác nhận của con người (Human-in-the-loop) ở các bước quan trọng.

*   **Bước 1: Khởi tạo ngữ cảnh (Context Initialization):** 
    Bạn nạp cho AI bối cảnh hệ thống, các tài liệu đặt tả yêu cầu (Requirement, SRS, User Story), mục tiêu kiểm thử (MVP) và thông tin phạm vi tính năng cần test.
*   **Bước 2: Phân tích yêu cầu và phát hiện điểm mù (Requirement Analysis & Q&A):** 
    AI đóng vai trò như một Senior Business Analyst (BA) hoặc Senior QA để rà soát tài liệu. AI sẽ chỉ ra các lỗ hổng logic, điểm mù thiếu sót trong tài liệu và đưa ra danh sách câu hỏi nghi vấn để bạn (hoặc BA/PO) confirm, làm rõ trước khi đi tiếp.
*   **Bước 3: Phân rã hệ thống (System Decomposition):** 
    Sau khi ngữ cảnh đã rõ ràng, AI tự động phân rã tính năng/module lớn thành các luồng chức năng nhỏ hơn (như luồng chính Happy Path, luồng rẽ nhánh, luồng ngoại lệ/lỗi) để dễ quản lý và không bỏ sót.
*   **Bước 4: Đánh giá độ bao phủ và phân cấp độ ưu tiên (Traceability & Coverage):** 
    AI liên kết các trường hợp kiểm thử với các yêu cầu ban đầu để đảm bảo độ bao phủ (Traceability). AI cũng phân chia độ ưu tiên cho các test case (High, Medium, Low) và phân nhóm (UI, Security, Functional, v.v.). Con người cần review lại danh sách này trước khi tạo test case chi tiết.
*   **Bước 5: Sinh kịch bản kiểm thử chi tiết (Detailed Test Case Generation):** 
    AI áp dụng các kỹ thuật thiết kế kiểm thử tiêu chuẩn (như phân vùng tương đương, phân tích giá trị biên, bảng quyết định, chuyển đổi trạng thái) để sinh ra bộ kịch bản kiểm thử chi tiết, rõ ràng.
*   **Bước 6: Chuẩn hóa định dạng và xuất báo cáo (Standardize & Export):** 
    AI ánh xạ bộ kịch bản đã sinh vào biểu mẫu (template) chuẩn của dự án và xuất ra các định dạng mong muốn như Markdown (.md), CSV, hoặc Excel (.xlsx) để lưu trữ và chia sẻ.

---

### II. Quy trình Kiểm thử Automation (Automation 6 bước)
Quy trình này kế thừa kết quả từ bộ test case manual để chuyển hóa thành kịch bản code tự động. Khác với manual, quy trình này hướng tới việc tự động hóa hoàn toàn cả 6 bước (chỉ cần kích hoạt "one-click").

*   **Bước 1: Khởi tạo ngữ cảnh (Context Setup):** 
    Nạp dữ liệu đầu vào bao gồm bộ test case manual đã chuẩn hóa (thường là file Markdown hoặc CSV), thông tin môi trường và tài khoản đăng nhập hệ thống để AI chuẩn bị kiểm thử.
*   **Bước 2: Phân tích UI và dò tìm Locator thực tế (UI Analysis & DOM Investigation):** 
    AI tự động mở trình duyệt thật (thông qua Playwright/Selenium MCP Server), tự động rà quét và phân tích cây thư mục DOM thực tế của trang web (hoặc mobile/API) để lấy các phần tử (element locator) chính xác, tuyệt đối không đoán mò.
*   **Bước 3: Thiết kế kiến trúc và mô hình hóa mã nguồn (Framework & POM Design):** 
    AI tổ chức mã nguồn theo mô hình **Page Object Model (POM)**. AI sẽ tạo các Class Page riêng biệt để quản lý locator và các phương thức xử lý cho từng trang, giúp mã nguồn sạch và dễ bảo trì.
*   **Bước 4: Chuẩn bị dữ liệu kiểm thử (Test Data Preparation):** 
    AI chuẩn bị dữ liệu kiểm thử, thiết lập các cơ chế tự động sinh dữ liệu ngẫu nhiên (random) cho các trường bắt buộc để tránh trùng lặp dữ liệu, hoặc cấu hình đọc data từ các file lưu trữ như JSON/CSV.
*   **Bước 5: Sinh mã kịch bản kiểm thử (Test Script Generation):** 
    AI tự động viết các kịch bản test (Test Script) hoàn chỉnh tương ứng với danh sách test case ban đầu, áp dụng các hàm đợi thông minh (Smart Wait) để đảm bảo kịch bản chạy ổn định.
*   **Bước 6: Thực thi kịch bản và tự động sửa lỗi (Execution & Self-Healing):** 
    AI thực hiện chạy kịch bản kiểm thử. Nếu xảy ra lỗi hoặc test case bị fail, AI có cơ chế tự động đọc log lỗi, tự động sửa code (Self-Healing) và chạy lại cho đến khi toàn bộ kịch bản pass hoàn toàn, sau đó xuất báo cáo trực quan (như Allure Report).
