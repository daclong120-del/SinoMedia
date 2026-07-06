Dưới đây là tóm tắt các đặc điểm kiến trúc cốt lõi của hệ thống **SinoMedia**:

### 1. Kiến trúc Backend kép (Dual-Backend)
* **Supabase**: Backend quản lý (BaaS) xử lý Auth, Database và Realtime.
* **Crawler Pipeline**: Backend tính toán (Worker) chạy trên VPS xử lý Playwright và HTTP requests.

### 2. Frontend giao tiếp đơn điểm (Single Endpoint)
* Cả Next.js Dashboard và Expo Mobile App chỉ kết nối tới Supabase.
* Tuyệt đối không giao tiếp trực tiếp với Crawler Pipeline.

### 3. Phân tách nhiệm vụ qua Hàng đợi (Queue-based Decoupling)
* Frontend chỉ ghi lệnh vào DB -> Crawler tự động quét DB để xử lý ngầm (Asynchronous).
* Tránh tắc nghẽn hoặc Timeout trên giao diện khi cào dữ liệu lớn.

### 4. Đồng bộ thời gian thực (Realtime WebSocket)
* Crawler cập nhật tiến độ và ghi log lên DB -> Supabase tự động đẩy thời gian thực lên giao diện thông qua kết nối WebSocket.

### 5. Khả năng chịu lỗi độc lập (Fault Tolerance)
* Nếu Crawler sập, Frontend vẫn hoạt động bình thường (người dùng vẫn xem được dữ liệu cũ và lên lịch cào các task mới chờ sẵn).

### 6. Bảo mật cao (Security)
* Toàn bộ tài khoản crawl, proxy và cơ chế bypass bot được ẩn an toàn sau máy chủ VPS, không bị lộ ra phía Client (Frontend).