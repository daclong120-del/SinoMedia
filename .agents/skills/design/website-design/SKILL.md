---
name: website-design
description: >-
  Dùng skill này để LÊN KHUNG SƯỜN / THIẾT KẾ CẤU TRÚC cho một website hoặc
  web app TRƯỚC KHI tạo JSON thiết kế hoặc viết code frontend. Kích hoạt khi
  người dùng nói những điều như "tôi cần thiết kế website", "lên sitemap",
  "cần xác định các trang/tính năng cần có", "phác thảo cấu trúc trước khi
  dựng UI", "tôi có backend nhưng chưa có frontend", hoặc khi họ có sẵn một
  frontend/design mẫu (ví dụ một thư mục "init-design") và muốn xây một
  website MỚI lấy cảm hứng phong cách từ đó nhưng có mục đích, nội dung và
  cấu trúc hoàn toàn riêng. LUÔN ưu tiên dùng skill này trước khi đụng vào
  bước tạo file JSON thiết kế hoặc viết code React/HTML cho một website mới
  — đây là bước 1 trong quy trình 3 bước, gồm thiết kế cấu trúc website
  (skill này, output là Markdown), sau đó sinh JSON thiết kế chi tiết, rồi
  mới triển khai code. Không dùng skill này cho việc sửa nhỏ một trang đã
  tồn tại, hay khi người dùng đã có sẵn sitemap/cấu trúc rõ ràng và chỉ cần
  bắt tay code luôn.
---

# Thiết kế cấu trúc Website (bước 1/3)

## Vai trò trong quy trình lớn hơn

Đây là bước đầu tiên trong một quy trình 3 bước để dựng frontend cho một dự án:

1. **Thiết kế cấu trúc website (skill này)** — xác định website cần những trang gì, mỗi trang có gì, phục vụ ai. Output: **một file Markdown**, không phải JSON, không phải code.
2. **Sinh JSON thiết kế** (skill khác) — dựa vào file Markdown ở bước 1 để tạo JSON chi tiết theo từng trang/component.
3. **Triển khai** (skill khác) — dựa vào JSON, file Markdown, và (nếu có) design mẫu gốc để viết code thật.

Nhiệm vụ của skill này chỉ dừng ở bước 1. Đừng nhảy cóc sang viết JSON hay code — làm vậy sẽ phá vỡ toàn bộ lý do quy trình được tách thành 3 bước: mỗi bước cần một bản nháp đã được con người xác nhận trước khi bước sau dựa vào nó.

## Nguyên tắc cốt lõi

- **Cấu trúc phải bắt nguồn từ dữ liệu thật, không đoán mò.** Hai nguồn sự thật: (a) backend thực sự hỗ trợ những gì, (b) người dùng thực sự cần gì. Đừng bịa ra trang hay tính năng mà backend không có endpoint/model tương ứng, và đừng tự quyết thay người dùng những câu hỏi mang tính sản phẩm (mục tiêu kinh doanh, đối tượng dùng...).
- **Nếu có frontend/design mẫu tham khảo (ví dụ thư mục "init-design"), nó chỉ là kho phong cách — không phải khuôn cấu trúc.** Được phép lấy: design tokens (màu, font, spacing), danh sách component tái dùng (Button, Card, Table, Modal...), cảm hứng UI. Tuyệt đối không lấy sitemap, danh sách trang, hay luồng điều hướng của mẫu đó để áp vào website mới — hai website phục vụ mục đích khác nhau nên cấu trúc thông tin (information architecture) phải được thiết kế lại từ đầu. Nếu vô tình để cấu trúc của mẫu ảnh hưởng, đó là dấu hiệu cần dừng lại và quay về nhu cầu thực tế của website mới.
- **Không tạo JSON, không viết code, không quyết định chi tiết thị giác (màu sắc cụ thể, font cụ thể) ở bước này.** Những thứ đó thuộc bước 2 và 3.

## Quy trình từng bước

### Bước 1 — Khám phá backend

Tìm và đọc code backend của dự án (routes/controllers, models/schema, migration, OpenAPI/Swagger nếu có, package.json để biết framework). Ghi lại:
- Các entity/model chính và quan hệ giữa chúng
- Các nhóm endpoint theo chức năng (vd: auth, orders, products...)
- Có phân quyền/role không, và role nào thấy/làm được gì

Mục tiêu: biết chính xác frontend CÓ THỂ và NÊN hiển thị/thao tác những gì, để không đề xuất tính năng mà backend chưa hỗ trợ.

### Bước 2 — Khám phá design mẫu tham khảo (nếu người dùng có, ví dụ init-design)

Chỉ trích xuất phần **phong cách/component**, tách bạch rõ khỏi cấu trúc trang:
- Design tokens nếu có (file json/css/tailwind config: màu, spacing, typography)
- Danh sách component có sẵn trong thư mục components/ (loại, không phải nội dung cụ thể)

Không đọc router/danh sách trang của mẫu này để suy luận trang mới cần gì.

### Bước 3 — Đặt câu hỏi làm rõ cho người dùng

Sau khi đã xem backend (và mẫu tham khảo nếu có), hỏi người dùng những gì code **không thể** trả lời — tránh hỏi lại điều đã suy ra được. Nếu có công cụ hỏi tương tác (ví dụ dạng câu hỏi trắc nghiệm/nút bấm), ưu tiên dùng để người dùng trả lời nhanh gọn. Các nhóm câu hỏi gợi ý, chọn lọc theo ngữ cảnh chứ không hỏi hết một lượt:

- **Mục đích & đối tượng**: Website phục vụ ai, mục tiêu chính (bán hàng, quản trị nội bộ, giới thiệu dịch vụ, dashboard số liệu...)
- **Phạm vi bản đầu**: Trang nào bắt buộc có ở MVP, trang nào để sau
- **Vai trò người dùng**: có phân quyền khác nhau không, mỗi vai trò thấy gì khác nhau (nếu backend chưa nói rõ)
- **Luồng chính**: 2–3 hành trình người dùng quan trọng nhất
- **Yêu cầu đặc biệt**: đa ngôn ngữ, responsive/mobile, real-time, SEO, offline...

### Bước 4 — Tổng hợp & đề xuất cấu trúc

Kết hợp thông tin backend + câu trả lời người dùng, soạn bản nháp gồm:
- Sitemap: danh sách trang/route kèm độ ưu tiên
- Với mỗi trang: mục đích, các section/khối nội dung chính, dữ liệu hiển thị (map tới model/endpoint backend cụ thể), hành động người dùng có thể thực hiện
- Cấu trúc điều hướng (menu chính, menu phụ/footer)
- Danh sách endpoint backend chưa được dùng tới, hoặc — quan trọng hơn — danh sách những gì frontend cần mà backend hiện **chưa có**, để người dùng biết cần bổ sung backend

### Bước 5 — Xác nhận với người dùng

Trình bày bản nháp, hỏi xác nhận hoặc điều chỉnh trước khi chốt. Đây là nền tảng cho JSON và code ở hai bước sau — sai ở đây sẽ kéo theo sai dây chuyền, nên đáng để dừng lại xác nhận thay vì tự chốt luôn.

### Bước 6 — Xuất file kết quả

Lưu bản đã chốt thành **một file Markdown** (gợi ý tên `website-design.md`, hoặc `docs/design/site-structure.md` nếu dự án có thư mục docs riêng). File này là đầu vào cho skill sinh JSON ở bước 2.

## Mẫu cấu trúc file output

```markdown
# Thiết kế cấu trúc – [Tên dự án]

## 1. Tổng quan
- Mục đích:
- Đối tượng người dùng:
- Vai trò/phân quyền:

## 2. Sitemap
| Route | Tên trang | Ưu tiên | Mô tả ngắn |
|---|---|---|---|

## 3. Chi tiết từng trang
### [Tên trang] (`/route`)
- Mục đích:
- Section/khối nội dung chính:
- Dữ liệu hiển thị (nguồn backend: model/endpoint):
- Hành động người dùng:
- Ghi chú:

(lặp lại cho từng trang)

## 4. Điều hướng
- Menu chính:
- Menu phụ / footer:

## 5. Component tham khảo phong cách (nếu có design mẫu, vd init-design)
- Design tokens:
- Component có thể tái dùng:
> Lưu ý: mục này chỉ mang tính tham khảo phong cách, không quyết định cấu trúc trang ở trên.

## 6. Ghi chú backend
- Endpoint đã có và sẽ dùng:
- Endpoint còn thiếu, cần backend bổ sung:
```

## Bàn giao cho bước tiếp theo

Sau khi người dùng xác nhận file Markdown này, nhắc rõ: bước tiếp theo là dùng skill sinh JSON thiết kế, đọc file Markdown vừa tạo (và design mẫu gốc nếu cần lấy chi tiết style) để sinh JSON chi tiết theo từng trang/component — chưa nên viết code ở giai đoạn này.