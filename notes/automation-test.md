
### Bước 1: Sắp xếp các tệp vào đúng thư mục dự án
Để Google Antigravity tự động nhận diện được các quy trình, bạn bắt buộc phải đặt chúng vào đúng cấu trúc thư mục quy định:
1. **Tạo cấu trúc thư mục:** Trong thư mục gốc dự án của bạn, hãy tạo thư mục `.agent`. Bên trong thư mục `.agent`, tiếp tục tạo thư mục con tên là `workflow`.
2. **Di chuyển các tệp:** Di chuyển toàn bộ 6 tệp tin `.md` workflow bạn đang có vào đường dẫn: **`.agent/workflow/`**.
3. **Đảm bảo thư mục Skill đã sẵn sàng:** Hãy chắc chắn các tệp kỹ năng (`skill.md` của `requirement_analy`, `test_design`, `locator_analy`,...) cũng đã được đặt đúng vị trí trong thư mục `.agent/skill/` tương ứng, vì các workflow này sẽ gọi đến các skill đó để thực thi.

---

### Bước 2: Nạp dự án vào Google Antigravity
1. Bật công cụ **Google Antigravity** trên máy tính của bạn.
2. Vào **File** -> **Open Folder** (hoặc mở thư mục dự án trống ban đầu của bạn). Do Antigravity sử dụng mã nguồn mở của VS Code, giao diện quản lý thư mục sẽ hiển thị ở bảng bên trái.
3. Lúc này, hệ thống AI Agent sẽ tự động quét và nạp toàn bộ cấu trúc `rule`, `skill`, và `workflow` của bạn. Bạn có thể kiểm tra danh sách này bằng cách click vào **dấu ba chấm ở khung chat** -> chọn **Customization** -> chuyển sang tab **Workflow** để thấy các quy trình đã hiển thị thành công.

---

### Bước 3: Cách gọi thực thi quy trình (One-Click / Slash Command)
1. **Khởi động phiên chat:** Mở một cuộc hội thoại mới trên Antigravity.
2. **Gọi quy trình:** Tại khung chat, hãy gõ dấu sạc **`/`**. Một danh sách các quy trình bạn đã cấu hình sẽ tự động hiện lên. 
3. **Chọn quy trình mong muốn:** Chọn quy trình bạn muốn chạy phù hợp với mục tiêu kiểm thử của mình:
   * Muốn tạo khung xương dự án tự động hóa ban đầu $\rightarrow$ chọn `/generate_automation_framework`.
   * Muốn viết đặc tả yêu cầu (SRS) từ một trang web thực tế $\rightarrow$ chọn `/generate_requirement`.
   * Muốn sinh kịch bản kiểm thử manual dựa trên rủi ro $\rightarrow$ chọn `/generate_manual_test`.
   * Muốn viết mã kiểm thử tự động từ kịch bản manual $\rightarrow$ chọn `/generate_automation_test_script`.
   * Muốn chạy kiểm thử liên thông (End-to-End) qua nhiều module $\rightarrow$ chọn `/generate_road_module`.
   * Muốn điều tra và tự sửa lỗi kịch bản kiểm thử bị chập chờn $\rightarrow$ chọn `/analy_flaky_test`.

---

### Bước 4: Nạp dữ liệu đầu vào và chạy kịch bản
1. **Kéo thả tệp tin nghiệp vụ:** Ngay sau câu lệnh `/` của bạn, hãy kéo và thả tệp tài liệu nghiệp vụ (như file SRS, User Story dạng `.md` hoặc `.txt`) trực tiếp vào khung chat.
2. **Cung cấp thông tin môi trường:** Điền thêm các thông tin bối cảnh cần thiết như URL trang web cần kiểm thử và tài khoản đăng nhập (email, password).
   * *Ví dụ một câu lệnh hoàn chỉnh:* `/generate_manual_test URL: https://example.com/login Tài khoản: admin@example.com` (kèm tệp tài liệu được kéo thả vào).
3. **Nhấn Enter:** AI Agent sẽ đọc các tài liệu này, tự động kích hoạt trình duyệt hoặc kết nối MCP Server tương ứng để rà quét và phân tích thực tế.

---

### Bước 5: Phối hợp tương tác với AI (Human-in-the-loop)
Khi quy trình được khởi chạy, AI Agent sẽ đi tuần tự qua từng bước đã được lập trình sẵn trong tệp workflow của bạn:
* **Tại các chốt chặn (🛑 STOP):** AI Agent sẽ dừng lại, in ra màn hình các nghi vấn logic (Q&A) hoặc các bản nháp kịch bản và chờ bạn phê duyệt.
* **Phản hồi AI:** Bạn chỉ cần đọc, đưa ra câu trả lời giải đáp hoặc chat **"Tiếp tục"** / **"Xác nhận"** để ra lệnh cho AI Agent tự động chạy tiếp các bước sau (như thiết kế test case chi tiết hoặc sinh code).

---

### Bước 6: Nhận kết quả nghiệm thu (Output)
Khi quy trình kết thúc (Bước 6), AI Agent sẽ:
1. **Xuất báo cáo thành phẩm:** Trả về bộ kết quả kiểm thử (dưới dạng bảng Markdown trực quan hoặc tệp Excel `.xlsx`/CSV cụ thể tùy theo quy định đầu ra của bạn).
2. **Tự động dọn dẹp hệ thống:** Kích hoạt cơ chế dọn dẹp các tệp log tạm, tệp tin rác phát sinh trong phiên làm việc để giữ không gian mã nguồn luôn sạch sẽ.
