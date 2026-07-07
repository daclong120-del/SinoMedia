# Thiết kế Chi tiết Phase 1 — Test và xác minh tải video R2 qua CLI

## 1. Thiết lập biến môi trường và chạy CLI
Chạy lệnh kiểm thử cào 3 bài viết Bilibili từ thư mục `crawler-pipeline/`.

Lệnh chạy trong PowerShell:
```powershell
$env:ENABLE_UPLOAD_R2='true'
$env:ENABLE_GET_MEIDAS='true'
$env:ENABLE_GET_COMMENTS='false'
$env:ENABLE_GET_SUB_COMMENTS='false'
npx.cmd tsx src/index.ts search "AI tools" 3 -p bilibili
```

*Lưu ý:*
- Bắt buộc phải set `ENABLE_GET_MEIDAS='true'` do crawler Bilibili sử dụng biến môi trường này để kiểm tra xem có tải video thực tế hay không (`crawler-pipeline/src/crawl/bilibili/core.ts:235`).
- Sử dụng `npx.cmd` trên Windows thay vì `npx`.

## 2. Kiểm tra dữ liệu database
Chạy script xem các post gần nhất:
```powershell
npx.cmd tsx scratch/view-posts.ts
```

Dữ liệu mong đợi:
- `media_source` = `'r2'`
- `media_status` = `'cached'`
- `media_urls` = `["bilibili/<bvid>/video.mp4"]`
- `cover_url` = `"bilibili/<bvid>/cover.jpg"`

## 3. Xác minh Dashboard
- Khởi chạy Dashboard nếu chưa chạy: `npm run dev` tại thư mục `dashboard/`.
- Mở URL: `http://localhost:3000/dash/creative/search?sort=views&page=1&limit=60`
- Click vào 1 trong các Creative vừa cào.
- Kiểm tra tab Network/Console để chắc chắn video được load từ địa chỉ:
  `https://pub-61ef6f7c6215df3616424def03fa7070.r2.dev/bilibili/<bvid>/video.mp4`
- Video phát mượt mà, không giật lag hay bị chặn.
