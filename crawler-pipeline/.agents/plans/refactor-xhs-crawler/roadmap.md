# 🗺️ ROADMAP — refactor-xhs-crawler   (cập nhật: 2026-07-06)

## 📍 Đang làm
- Phase: Phase 2 — XhsLogin & Session Management 🔄
- Item: Chuẩn bị kế hoạch cho Phase 2 (Đăng nhập và quản lý cookie XHS).
- Bước kế: Lập kế hoạch thiết kế và xin phép triển khai Phase 2.

## Phase
- `[x]` Phase 1 — XhsClient & Signature Generation
- 🔄 Phase 2 — XhsLogin & Session Management
- ⏳ Phase 3 — XhsExtractor & Core Scraping Orchestration

## ❓ Câu hỏi mở / Ghi chú nhanh
- Đã chốt sử dụng Playwright `page.evaluate` gọi `window._webmsxyw` trong browser context để lấy `X-S` và `X-T`.
- Phần `x-s-common` và `X-B3-Traceid` sẽ được tính toán trực tiếp trong Node.js (port thuật toán mrc và custom base64 từ Python).

> Marker: ⏳ chưa · 🔄 đang làm · ✅ xong · ⛔ chặn
