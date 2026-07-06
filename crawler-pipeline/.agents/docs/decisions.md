# Decision Log — crawler-pipeline

## 2026-07-06 — Chọn cơ chế sinh chữ ký XHS qua Playwright [initiative: refactor-xhs-crawler]
- Bối cảnh: Xiaohongshu sử dụng thuật toán obfuscated ký yêu cầu rất phức tạp (X-S, X-T) thay đổi liên tục, và x-s-common.
- Phương án đã cân nhắc: Port thủ công thuật toán xhshow sang JS (Dễ lỗi, khó bảo trì); Dựng RPC Python (Phức tạp môi trường chạy).
- Chọn phương án sử dụng Playwright `page.evaluate` gọi `window._webmsxyw` trực tiếp từ browser context cho `X-S`, `X-T`, đồng thời tự tính toán `x-s-common` trong Node.js bằng thuật toán MRC + Base64 port từ Python. Giúp đảm bảo tính ổn định và đồng nhất kiến trúc với Kuaishou.