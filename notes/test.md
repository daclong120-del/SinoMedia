Có, thế giới kiểm thử phần mềm được phân chia thành nhiều lớp khác nhau. Ngoài những loại bạn đã kể, đây là 5 loại kiểm thử quan trọng nhất mà các dự án thường áp dụng:

**1. Unit Test (Kiểm thử đơn vị)**

* **Mức độ:** Nhỏ nhất, nằm dưới cùng.
* **Nhiệm vụ:** Kiểm tra từng hàm (function) độc lập bên trong code xem có tính toán đúng logic không.
* **Ví dụ:** Hàm `kiem_tra_so_chan(4)` phải trả về `True`.

**2. Integration Test (Kiểm thử tích hợp)**

* **Mức độ:** Trung bình.
* **Nhiệm vụ:** Kiểm tra xem khi ghép 2 hoặc 3 bộ phận lại với nhau, chúng có giao tiếp đúng không (ví dụ: Code của Service có lấy đúng dữ liệu từ Database không).

**3. Regression Test (Kiểm thử hồi quy)**

* **Mức độ:** Toàn hệ thống.
* **Nhiệm vụ:** Chạy lại các bài test cũ mỗi khi bạn vừa thêm tính năng mới hoặc sửa xong một lỗi.
* **Mục đích:** Đảm bảo đoạn code mới đẩy lên không "đạp vỡ" những chức năng cũ vốn đang hoạt động bình thường.

**4. Performance / Load Test (Kiểm thử hiệu năng / chịu tải)**

* **Mức độ:** Hệ thống / Cơ sở hạ tầng.
* **Nhiệm vụ:** Mô phỏng hàng ngàn người dùng truy cập cùng lúc, hoặc tải dữ liệu lớn để xem server phản hồi nhanh hay chậm, khi nào thì hệ thống bị quá tải và sập.

**5. Security Test / Penetration Test (Kiểm thử bảo mật)**

* **Mức độ:** Chuyên sâu.
* **Nhiệm vụ:** Các chuyên gia bảo mật cố tình đóng vai hacker để tấn công, tìm kiếm các lỗ hổng (như SQL Injection, rò rỉ dữ liệu) để vá lại trước khi hệ thống ra mắt công chúng.