---
name: website-json-design
description: >-
  Dùng skill này để SINH CÁC FILE JSON THIẾT KẾ cho từng trang của một
  website, sau khi đã có file Markdown khung sườn từ skill website-design
  VÀ có một dự án frontend mẫu (ví dụ thư mục "init-design") mà trong đó
  một renderer/code thật sự đọc JSON để dựng UI (schema-driven UI). Kích
  hoạt khi người dùng nói những điều như "sinh JSON thiết kế từ file
  markdown này", "tạo file json cho từng trang theo schema của
  init-design", "convert khung sườn sang JSON", hoặc khi họ đã xác nhận
  xong bước thiết kế cấu trúc và muốn bước tiếp theo trước khi code. Đây
  là bước 2 trong quy trình 3 bước: (1) thiết kế cấu trúc website → (2)
  sinh JSON thiết kế (skill này) → (3) triển khai code. Bắt buộc phải có
  sẵn file Markdown đã chốt từ bước 1 trước khi dùng skill này — nếu chưa
  có, hãy dùng skill website-design trước. Không dùng skill này nếu JSON
  chỉ để làm tài liệu tham khảo cho người đọc chứ không có renderer nào
  parse nó — trường hợp đó không cần đúng schema nghiêm ngặt và có thể xử
  lý đơn giản hơn.
---

# Sinh JSON thiết kế (bước 2/3)

## Vai trò trong quy trình lớn hơn

Bước 2 trong quy trình 3 bước dựng frontend:

1. Thiết kế cấu trúc website (skill `website-design`) → output: file Markdown khung sườn
2. **Sinh JSON thiết kế (skill này)** → output: JSON theo từng trang + các JSON phụ trợ (style/nav/config...)
3. Triển khai code (skill khác) → dùng JSON + Markdown + design mẫu gốc để dựng UI thật

## Hai đầu vào bắt buộc, hai vai trò khác nhau

- **File Markdown khung sườn đã chốt (từ bước 1)** — nguồn sự thật DUY NHẤT cho *nội dung và cấu trúc*: trang nào, section nào, nói về cái gì, hành động gì, thứ tự điều hướng ra sao.
- **Dự án frontend mẫu có renderer đọc JSON (ví dụ init-design)** — nguồn sự thật DUY NHẤT cho *định dạng/schema* của file JSON: field nào bắt buộc, "type" nào hợp lệ, JSON lồng nhau thế nào, cần những file phụ trợ gì. Vì có code thật parse JSON này, sai schema nghĩa là UI vỡ — đây không phải chuyện thẩm mỹ, phải suy ra từ code thật chứ không được đoán.

Ngoài ra còn một lớp thứ ba, tuỳ chọn: **phong cách thị giác** (màu, font, spacing, component tái dùng) của init-design — được phép tái dùng NẾU người dùng muốn giữ style đó, vì đây là lựa chọn thẩm mỹ, tách biệt hoàn toàn khỏi nội dung.

**Không được lẫn ba lớp này với nhau.** Lỗi phổ biến nhất ở bước này là generate đúng schema JSON của init-design nhưng lại chép luôn nội dung/văn bản/chủ đề mẫu của nó — trong khi init-design là một website chủ đề hoàn toàn khác, chỉ được mượn *cách JSON được cấu trúc*, không được mượn *JSON nói gì*.

## Quy trình từng bước

### Bước 1 — Đọc kỹ file Markdown từ bước 1

Load toàn bộ sitemap, chi tiết từng trang (mục đích, section, dữ liệu, hành động), điều hướng, ghi chú backend. Đây là checklist: phải sinh ra đúng bấy nhiêu file JSON, mỗi file chứa đúng bấy nhiêu nội dung — dùng để đối chiếu ở bước cuối.

### Bước 2 — Dò ngược schema JSON từ init-design (bắt buộc, không được đoán)

Vì có renderer thật đọc JSON để dựng UI, sai schema đồng nghĩa UI vỡ khi chạy thật. Không suy đoán cấu trúc JSON từ trí nhớ hay quy ước "thường thấy" ở các dự án khác — phải đọc code thật của chính dự án này:

1. Tìm đoạn code renderer/parser: tìm trong init-design các dấu hiệu như `JSON.parse`, import động file `.json`, một registry/map từ chuỗi "type" sang component React, hoặc component tên kiểu `Renderer`, `DynamicPage`, `SchemaRenderer`, `PageBuilder`...
2. Liệt kê TẤT CẢ file JSON hiện có trong init-design, không chỉ 1 file — gồm cả file theo từng trang lẫn file phụ trợ (theme/style/design-tokens, navigation/menu, site config, i18n...)
3. Đối chiếu ít nhất 2-3 file JSON mẫu khác nhau với code renderer để rút ra: field nào bắt buộc/tuỳ chọn, danh sách giá trị "type"/"component" hợp lệ và props tương ứng của từng loại, cách JSON tham chiếu tới style (giá trị inline hay tham chiếu tới token), cách các file JSON phụ trợ liên kết với file JSON từng trang (ví dụ trang tham chiếu `theme.json` bằng key gì)
4. Tóm tắt lại schema đã hiểu (có thể trình bày ngay trong hội thoại, không nhất thiết cần file riêng) trước khi sinh bất kỳ JSON thật nào

Nếu renderer dùng cơ chế phức tạp/lạ, hoặc không tìm thấy điểm đọc JSON rõ ràng — **dừng lại và hỏi người dùng** thay vì đoán. Sinh sai hàng loạt file rồi sửa lại tốn công hơn nhiều so với việc hỏi trước khi bắt đầu.

### Bước 3 — Xác nhận nhanh trước khi sinh hàng loạt

Trình bày tóm tắt schema đã hiểu, rồi thử sinh JSON cho **đúng 1 trang** làm mẫu. Xin người dùng xác nhận, hoặc nếu init-design có sẵn dev server/script chạy renderer thì thử chạy trang mẫu đó để tự kiểm tra. Chỉ sau khi trang mẫu đúng mới sinh tiếp các trang còn lại — việc này chặn một lỗi hệ thống lặp lại trên toàn bộ site thay vì phải sửa từng file sau đó.

### Bước 4 — Sinh nội dung thật cho từng trang

Với mỗi trang trong sitemap (theo file .md), viết nội dung thật: tiêu đề, mô tả, nhãn nút, câu dẫn... bám sát mục đích và section đã mô tả trong .md. Nếu .md mới mô tả section ở mức ý tưởng (ví dụ "hero: giới thiệu ngắn gọn giá trị cốt lõi + nút CTA") mà chưa có câu chữ cụ thể, được phép soạn câu chữ cụ thể cho phần đó — miễn là bám đúng chủ đề/mục tiêu/tông giọng của website mới đã chốt ở bước 1. Tuyệt đối không tái sử dụng câu chữ, ví dụ, hay chủ đề nội dung của init-design — nó là một website khác.

### Bước 5 — Sinh các file JSON phụ trợ (style/theme/nav/config...)

Dựa theo danh sách file phụ trợ đã phát hiện ở bước 2:
- **Style/design tokens**: có thể tái dùng giá trị từ init-design nếu người dùng muốn giữ phong cách đó — xác nhận với người dùng nếu chưa rõ họ có muốn giữ nguyên style hay đổi (màu thương hiệu riêng, font riêng...)
- **Navigation/site config**: nội dung (tên menu, thứ tự trang, đường dẫn) lấy từ mục "Điều hướng" trong file .md — không lấy từ init-design, vì cấu trúc điều hướng thuộc về nội dung/cấu trúc của bước 1, không phải schema kỹ thuật

### Bước 6 — Đối chiếu & xác thực

- Đối chiếu từng file JSON sinh ra với checklist từ file .md: đủ trang, đủ section, đúng độ ưu tiên, không thiếu không thừa
- Parse thử từng file để chắc chắn JSON hợp lệ về cú pháp
- Nếu init-design có sẵn dev server hoặc script chạy renderer, thử chạy để bắt lỗi runtime (field thiếu, type không hợp lệ...) trước khi bàn giao — đừng đợi đến bước triển khai mới phát hiện

### Bước 7 — Xuất file kết quả

Lưu JSON theo đúng cấu trúc thư mục mà renderer của init-design mong đợi (thường là mirror theo cách tổ chức JSON của chính init-design, chỉ đổi nội dung bên trong). Đặt tên file rõ ràng theo route/tên trang, và tên các file phụ trợ theo đúng quy ước đã phát hiện được.

## Bàn giao cho bước tiếp theo

Sau khi người dùng xác nhận, các file JSON này + file Markdown gốc + (nếu cần) component/style của init-design sẽ là đầu vào cho skill triển khai (bước 3) — nơi thực sự ghép/viết code React cuối cùng để website chạy được.