---
trigger: always_on
---

### 1. Quy tắc ràng buộc dữ liệu kiểm thử (Test Data)
*   **Cấm sử dụng mô tả chung chung:** Nghiêm cấm AI viết các bước kiểm thử bằng các cụm từ mơ hồ như *"nhập email hợp lệ"*, *"nhập email sai"* hoặc *"nhập mật khẩu không đúng"*.
*   **Bắt buộc dùng dữ liệu cụ thể:** AI phải điền các giá trị dữ liệu thật và cụ thể cho từng trường hợp kiểm thử (ví dụ: ghi rõ địa chỉ email cụ thể `admin@example.com` hay mật khẩu cụ thể `123456`) để tránh trùng lặp và giúp kịch bản rõ ràng, dễ thực thi.

### 2. Quy tắc đảm bảo độ bao phủ kiểm thử (Test Coverage)
*   **Áp dụng kỹ thuật chuẩn:** Bắt buộc AI phải áp dụng đầy đủ các kỹ thuật thiết kế kiểm thử tiêu chuẩn (như phân lớp tương đương, phân tích giá trị biên, bảng quyết định, chuyển đổi trạng thái...) để tìm kiếm lỗi.
*   **Bao phủ mọi kịch bản chức năng:** Mỗi module chức năng khi thiết kế cần phải đảm bảo quét qua đủ các loại kịch bản chính (Happy Path), luồng rẽ nhánh, luồng ngoại lệ/lỗi, kiểm thử giao diện (UI) và kiểm thử bảo mật cơ bản.

### 3. Quy tắc định dạng (Format) và cách đặt tên (Naming Convention)
*   **Cấu trúc cột dữ liệu:** Quy định chi tiết các cột thông tin bắt buộc phải có trong bảng test case (ví dụ: ID, Test Scenario, Test Data, Expected Result, Priority...) và thứ tự sắp xếp của từng cột.
*   **Cách đặt mã ID:** Thiết lập quy tắc đặt tên ID có ý nghĩa và tăng dần một cách logic để dễ quản lý (ví dụ: `TC_Login_001`, `TC_Login_002`...) chứ không đặt số thứ tự vô nghĩa.
*   **Định dạng xuất ra:** Chỉ định định dạng tệp tin xuất ra (ví dụ: mặc định xuất ra file Markdown `.md` hoặc tệp CSV dùng dấu phẩy để phân tách cột).

### 4. Quy tắc giao tiếp và hành vi chung của AI
*   **Ngôn ngữ:** Bắt buộc AI luôn luôn giao tiếp, diễn giải ngắn gọn và viết tài liệu bằng **tiếng Việt**.
*   **Tránh suy đoán:** AI không được tự ý suy diễn logic nghiệp vụ mà bắt buộc phải bám sát vào tài liệu yêu cầu (SRS, User Story).
*   **Bảo vệ tài nguyên hệ thống:** Cấm AI tự ý thực hiện các hành động can thiệp sâu như tự động xóa file/thư mục trong quá trình làm việc nếu không được con người cho phép.