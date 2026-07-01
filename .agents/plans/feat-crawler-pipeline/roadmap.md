# 🗺️ ROADMAP — feat-crawler-pipeline

Xây dựng pipeline cào dữ liệu (Douyin/TikTok/XHS) theo kiến trúc lai **CloakBrowser + HTTP request**, ghi vào **Supabase Postgres + Cloudflare R2**, để app Expo hiện tại đọc và hiển thị. Deploy trên **1 VPS 2GB duy nhất**.

> 📄 Tài liệu kiến trúc gốc: [.agents/docs/crawler-hybrid-architecture.md](../../docs/crawler-hybrid-architecture.md)

- ✅ Phase 1 — Bịt lỗ hổng bảo mật secret (`api.txt`)            → design/phase-01.md
- ✅ Phase 2 — Thiết kế schema Supabase cho dữ liệu cào           → design/phase-02.md
- ✅ Phase 3 — Khung crawler + Sign Service (CloakBrowser)        → design/phase-03.md
- ✅ Phase 4 — HTTP crawl workers + ghi Supabase & upload R2      → design/phase-04.md
- ✅ Phase 5 — Deploy VPS 2GB (swap, systemd, kỷ luật RAM)        → design/phase-05.md
- ✅ Phase 6 — App Expo hiển thị nội dung đã cào                  → design/phase-06.md

> Marker: ⏳ chưa · 🔄 đang làm · ✅ xong · ⛔ chặn

## Nguyên tắc kiến trúc (đọc trước khi làm)
1. **Crawler là repo/hệ thống RIÊNG**, KHÔNG nằm trong repo Expo. Hai hệ thống chỉ gặp nhau ở Supabase DB + R2.
2. **Browser chạy "khó nhưng ít"** (login + sinh chữ ký), **HTTP chạy "dễ nhưng nhiều"** (cào khối lượng lớn).
3. Trên VPS 2GB: **không giữ browser thường trực** — bật ngắn hạn để sinh sign/cookie rồi đóng ngay.
4. Ưu tiên **port hàm sign ra Node/PyExecJS** để steady-state gần như không cần browser.
