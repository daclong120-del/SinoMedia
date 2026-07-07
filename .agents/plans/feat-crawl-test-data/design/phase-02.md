# Thiết kế Phase 2 — Cào và nạp 50 dữ liệu từ Bilibili

## 🎯 Mục tiêu
Cào thành công 50 bài viết/video từ Bilibili với từ khóa "AI" và nạp vào database local.

## 🛠️ Hướng tiếp cận
Sử dụng lệnh CLI `search` của `crawler-pipeline` với tham số:
- Keyword: `AI`
- Max count: `50`
- Platform: `bilibili`

Lệnh thực thi:
```bash
npx tsx src/index.ts search "AI" 50 -p bilibili
```

## 🔍 Kế hoạch thực hiện
1. Đảm bảo file `crawler-pipeline/.env.local` trỏ đúng cơ sở dữ liệu local.
2. Thực thi lệnh cào 50 bài Bilibili.
3. Quan sát log tiến trình của crawler để phát hiện lỗi mạng/xác thực/R2.
4. Kiểm định dữ liệu được lưu thành công qua SQL.

## ⚠️ Rủi ro & Giải pháp phòng ngừa
- **Tốc độ cào & Block**: Bilibili có thể block IP nếu gửi request quá nhanh.
  - *Giải pháp*: `crawler-pipeline` đã được thiết kế sẵn cơ chế delay giữa các request và fake user-agent thông qua CloakBrowser/Playwright.
- **Lỗi Upload R2**: Nếu có quá nhiều video cần upload lên R2, R2 có thể trả về lỗi quota hoặc timeout.
  - *Giải pháp*: Fallback lưu link media gốc nếu upload R2 thất bại.
