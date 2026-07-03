---
name: website-implementation
description: >-
  Dùng skill này để TRIỂN KHAI CODE THẬT cho một website, sau khi đã có
  file Markdown khung sườn (skill website-design) VÀ các file JSON thiết
  kế (skill website-json-design) đã được xác nhận. Kích hoạt khi người
  dùng nói những điều như "triển khai code", "dựng website từ JSON thiết
  kế này", "code frontend từ json + markdown design", "ghép JSON vào
  renderer để chạy thật", hoặc khi họ đã xong hai bước thiết kế trước đó
  và muốn có một website thực sự chạy được, nối với backend thật. Đây là
  bước 3 (bước cuối) trong quy trình 3 bước: (1) thiết kế cấu trúc website
  → (2) sinh JSON thiết kế → (3) triển khai code (skill này). Bắt buộc
  phải có sẵn file Markdown đã chốt và JSON thiết kế đã xác nhận trước khi
  dùng skill này — nếu thiếu, dùng skill website-design hoặc
  website-json-design trước. Không dùng skill này để tự quyết định lại
  cấu trúc trang hay nội dung — việc đó thuộc hai skill trước.
---

# Triển khai code (bước 3/3)

## Vai trò trong quy trình lớn hơn

Bước cuối trong quy trình 3 bước:

1. Thiết kế cấu trúc website (skill `website-design`) → file Markdown khung sườn
2. Sinh JSON thiết kế (skill `website-json-design`) → JSON theo từng trang + phụ trợ
3. **Triển khai code (skill này)** → website thật, chạy được, nối với backend thật

Nhiệm vụ ở đây KHÔNG phải là thiết kế lại — cấu trúc, nội dung, và schema JSON đã chốt xong ở hai bước trước. Việc của skill này là làm cho tất cả **chạy được thật sự**: đúng dữ liệu thật từ backend, đúng tương tác người dùng, không lỗi khi build/chạy.

## Bốn nguồn thông tin, bốn vai trò khác nhau

- **File .md khung sườn (bước 1)** — nguồn sự thật cho *ý định*: trang nào tồn tại vì lý do gì, section nào phục vụ mục đích gì, độ ưu tiên ra sao. Dùng để rà soát cuối cùng xem code có đúng ý định ban đầu không.
- **JSON thiết kế (bước 2)** — nguồn sự thật cho *nội dung & cấu trúc chi tiết* từng trang, đã đúng schema mà renderer hiểu được.
- **init-design (renderer + kho component + cấu hình build/style)** — nguồn *hạ tầng kỹ thuật*: cách JSON được dựng thành UI, các component có sẵn, quy ước style/build. Chỉ lấy phần hạ tầng này, không lấy route/nội dung demo của nó — những cái đó đã bị thay thế bởi bước 1 và 2 rồi.
- **Backend thật của dự án** — nguồn sự thật cho *dữ liệu thật*: mỗi trang gọi API nào, request/response ra sao. Đọc thẳng code backend để lấy contract chính xác (route, method, params, response shape, lỗi có thể có) — mục "ghi chú backend" trong file .md ở bước 1 chỉ ở mức tổng quan, không đủ chi tiết để code, nên phải quay lại đọc code thật ở bước này.

## Nguyên tắc cốt lõi

- **Đừng thiết kế lại.** Nếu trong lúc code phát hiện cấu trúc/nội dung/schema có vấn đề, quay lại skill tương ứng ở bước 1 hoặc 2 để sửa công khai — đừng tự ý đổi ngầm trong lúc viết code, vì hai file đó là nguồn tham chiếu cho cả những lần chạy sau.
- **Ưu tiên tái dùng hạ tầng render sẵn có** thay vì viết lại từ đầu, vì JSON ở bước 2 vốn được sinh ra để tương thích với chính renderer đó. Chỉ viết code mới khi: (a) cần một loại component chưa có trong kho, hoặc (b) cần logic tương tác/nghiệp vụ mà JSON khai báo thuần tuý không diễn đạt được (validate form phức tạp, luồng nhiều bước, phân quyền hiển thị theo role...).
- **Không lấy gì từ backend/dữ liệu demo của init-design.** Nếu init-design có sẵn cơ chế mock data hay gọi một backend demo để minh hoạ, đó chỉ để hiểu cách renderer hoạt động — dữ liệu thật phải đến từ backend thật của dự án.

## Quy trình từng bước

### Bước 1 — Dựng khung dự án

Tuỳ tình huống cụ thể:
- Nếu hợp lý để mở rộng ngay trong/cạnh init-design (cùng repo, cùng hạ tầng build) → tạo route/thư mục mới trong đó, giữ nguyên renderer + kho component, bỏ route và nội dung demo cũ.
- Nếu cần một project frontend riêng biệt → copy phần hạ tầng cần thiết (renderer, kho component, cấu hình build/style) sang project mới, không mang theo nội dung/route demo hay logic gắn cứng với backend demo của init-design.

Nếu không rõ hướng nào phù hợp với dự án, hỏi người dùng trước khi bắt tay — đây là quyết định tốn công sửa nếu chọn sai hướng.

### Bước 2 — Đọc chính xác API contract từ backend thật

Với mỗi trang trong sitemap (.md bước 1), tra lại phần "dữ liệu hiển thị"/"ghi chú backend" để biết endpoint liên quan, rồi đọc thẳng code backend (route handler, model/schema, DTO hay response serializer) để biết chính xác: method, path, params/query, cấu trúc response, mã lỗi có thể gặp, có cần auth/token không. Không đoán cấu trúc response từ tên biến hay từ mô tả chung chung.

### Bước 3 — Đặt JSON + nội dung từ bước 2 vào đúng vị trí

Copy các file JSON (từng trang + phụ trợ) từ bước 2 vào đúng cấu trúc thư mục mà renderer mong đợi (đã xác định ở bước 2 của skill `website-json-design`). Đấu nối route cho từng trang theo đúng sitemap trong .md.

### Bước 4 — Triển khai lấy dữ liệu thật

Với mỗi trang, viết lớp gọi API (service/hook) theo đúng contract đã đọc ở Bước 2 của skill này, thay thế mọi cơ chế mock/demo data mà init-design từng dùng để minh hoạ renderer. Xử lý trạng thái loading/error/rỗng dữ liệu hợp lý — không cần cầu kỳ nhưng không được bỏ qua, vì dữ liệu thật luôn có khả năng lỗi/rỗng mà demo data không thể hiện.

### Bước 5 — Xử lý phần JSON không diễn đạt hết

Với các "hành động người dùng" trong .md mà JSON khai báo thuần không thể hiện được (validate form, luồng nhiều bước, tương tác phức tạp, hiển thị khác nhau theo vai trò...), viết component/logic bổ sung và gắn đúng vị trí trong cây mà renderer dựng ra. Mở rộng registry component của renderer nếu cần một loại component hoàn toàn mới.

### Bước 6 — Bắt đầu từ 1 trang, chạy thử, rồi mới mở rộng

Triển khai đầy đủ 1 trang (JSON + dữ liệu thật + tương tác) trước, chạy thử thực tế bằng dev server, đối chiếu với mô tả trang đó trong .md xem có đúng ý định ban đầu không. Chỉ sau khi trang mẫu chạy đúng mới tiếp tục các trang còn lại — tránh lặp lại cùng một lỗi wiring trên toàn bộ site rồi mới phát hiện.

### Bước 7 — Rà soát toàn site trước khi bàn giao

- Đối chiếu từng trang đã triển khai với sitemap + chi tiết trang trong .md: đủ trang, đúng độ ưu tiên, không sót section nào
- Kiểm tra điều hướng giữa các trang hoạt động đúng theo mục "Điều hướng" trong .md
- Kiểm tra không còn sót nội dung/route demo nào của init-design
- Build thử và kiểm tra lỗi console/log, sửa hết trước khi coi là hoàn thành

## Không thuộc phạm vi skill này

- Không tự quyết định lại cấu trúc trang, nội dung, hay schema JSON — nếu phát hiện những thứ này cần đổi, quay lại skill `website-design` hoặc `website-json-design` để sửa công khai ở đúng nguồn.
- Không cần tối ưu hiệu năng/SEO sâu trừ khi file .md ở bước 1 có ghi yêu cầu cụ thể về việc đó.