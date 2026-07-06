# 🌳 Detail Map — Crawler Tasks Insertion Flow

- Người dùng nhập danh sách targets vào textarea và bấm "Tạo nhiệm vụ"
  - └ à, nghĩa là cần lấy text từ form → parse thành mảng các dòng  [quyết định: split theo `\n`]  ✅
      - └ à, nghĩa là cần dọn dẹp các dòng → trim, loại bỏ dòng trống  [quyết định: .map(trim) + .filter(len > 0)]  ✅
      - └ à, nghĩa là cần giới hạn ký tự mỗi dòng → tránh URL quá dài  [quyết định: max 500 ký tự]  ✅
      - └ à, nghĩa là cần lọc trùng lặp nội bộ trong danh sách gửi đi  [quyết định: dùng Set lọc trùng case-insensitive]  ✅
      - └ à, nghĩa là cần giới hạn số lượng dòng được phép submit  [quyết định: max 50 dòng, báo lỗi nếu vượt quá]  ✅
  - └ à, nghĩa là cần đóng gói dữ liệu và gọi API bulk insert
      - └ à, nghĩa là cần gọi RPC Postgres thay vì insert thông thường  [quyết định: gọi RPC `create_crawler_tasks`]  ✅
          - └ à, nghĩa là DB phải kiểm tra trùng lặp nguyên tử (atomic dedupe)  [quyết định: loop check `EXISTS` trong transaction SQL]  ✅
          - └ à, nghĩa là DB phải kiểm tra giới hạn 50 dòng cứng  [quyết định: ném exception nếu `jsonb_array_length > 50`]  ✅
          - └ à, nghĩa là RPC trả về kết quả chi tiết  [quyết định: return JSON chứa inserted_count, skipped_count, errors]  ✅
  - └ à, nghĩa là cần hiển thị feedback kết quả cho người dùng
      - └ à, nghĩa là cần hiển thị toast báo cáo chi tiết  [quyết định: alert/toast danh sách lỗi/nhiệm vụ bỏ qua]  ✅
