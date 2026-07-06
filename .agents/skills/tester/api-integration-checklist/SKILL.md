# Checklist Kiểm Tra Kết Nối API — Frontend ↔ Backend

## 1. Backend — kiểm tra trước khi Frontend đụng vào

- [ ] API chạy độc lập, test bằng Postman/curl, trả đúng status code (200, 201, 400, 401, 404, 500)
- [ ] Response đúng cấu trúc JSON như tài liệu (Swagger/OpenAPI) mô tả
- [ ] Test các case lỗi: sai input, thiếu token, sai định dạng dữ liệu
- [ ] Method đúng chuẩn REST (GET / POST / PUT / PATCH / DELETE)
- [ ] Có versioning rõ ràng (`/api/v1/...`) nếu hệ thống lớn
- [ ] Đã bật CORS cho đúng domain Frontend được phép gọi
- [ ] Biến môi trường (DB URL, PORT, secret key...) đúng cho từng env

## 2. Frontend — kiểm tra khi gọi API

- [ ] `baseURL` đúng theo môi trường (không hardcode `localhost` khi build production)
- [ ] Header đầy đủ: `Content-Type`, `Authorization` (Bearer token), `Accept`
- [ ] Xử lý đủ trạng thái: loading / success / error / timeout
- [ ] Field dữ liệu nhận về khớp với tài liệu API (đề phòng Backend đổi tên field mà không báo)
- [ ] Có xử lý riêng cho từng mã lỗi (400, 401, 403, 404, 500)
- [ ] Có cơ chế refresh token / redirect login khi 401
- [ ] Kiểm tra tab **Network** trong DevTools: request gửi đi và response trả về đúng như kỳ vọng

## 3. Hạ tầng / DevOps — nơi hay bị lỗi vặt nhất

- [ ] Domain Frontend và Backend trỏ DNS đúng
- [ ] HTTPS hoạt động ở cả hai phía (tránh lỗi Mixed Content khi FE https gọi BE http)
- [ ] Header `Access-Control-Allow-Origin` cấu hình đúng domain FE (không để `*` nếu có gửi cookie/credentials)
- [ ] Reverse proxy (Nginx) route đúng `/api` xuống đúng service/port
- [ ] Firewall / Security Group không chặn port giao tiếp giữa 2 service
- [ ] Biến `API_URL` trong pipeline CI/CD được build đúng cho từng môi trường (dev/staging/prod)
- [ ] Health check của Backend trên Load Balancer đang "healthy"

## 4. Kiểm tra tích hợp End-to-End

- [ ] Chạy full luồng: FE gọi → BE xử lý → trả data → FE hiển thị đúng
- [ ] Test ở cả 3 môi trường: local, staging, production
- [ ] Test với data thật, không chỉ mock
- [ ] Đo latency, đảm bảo không timeout
- [ ] Test concurrent request nếu hệ thống có traffic cao
- [ ] Viết test tự động (Postman Collection Runner / Cypress / Playwright) chạy lại mỗi lần deploy trong CI/CD

## 5. Công cụ nên dùng

| Công cụ | Mục đích |
|---|---|
| Postman / Insomnia | Test API riêng lẻ, tách biệt khỏi FE để biết lỗi nằm ở đâu |
| DevTools Network tab | Xem chính xác request/response thật khi FE chạy |
| curl | Test nhanh từ server, hữu ích khi debug CORS hoặc SSL |
| Swagger UI | Vừa là tài liệu vừa test trực tiếp API |

**Lỗi thường gặp nhất:** CORS — `No 'Access-Control-Allow-Origin' header is present`.
→ Sửa ở Backend hoặc Nginx, Frontend không tự sửa được lỗi này.