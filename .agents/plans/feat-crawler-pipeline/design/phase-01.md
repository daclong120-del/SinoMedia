# Phase 1 — Bịt Lỗ Hổng Bảo Mật Secret

## Bối cảnh
File `api.txt` ở root repo đang chứa secret **thật, plaintext**:
- Cloudflare R2: Access Key ID, Token value, **Secret Access Key**, endpoint S3
- Supabase: Project ID, region, Data API URL

Kiểm tra tại thời điểm lập plan: `api.txt` **CHƯA bị track trong git** (`git ls-files --error-unmatch api.txt` báo không có). Rủi ro hiện ở mức: file plaintext trong working dir, dễ lỡ tay commit/share.

## Mục tiêu
Đưa secret về đúng chỗ (env, gitignore), đảm bảo không lọt vào git, và nhắc user rotate nếu cần.

## Việc cần làm

### 1. Chặn commit nhầm
Thêm vào `.gitignore` (root):
```
api.txt
```

### 2. Chuyển secret sang env đúng chỗ
- **R2 secrets** → dùng ở backend (crawler + Supabase edge). Đặt trong `supabase/.env.local` (đã gitignore) và trong `.env` của crawler:
  ```
  R2_ACCESS_KEY_ID=68b65e03...
  R2_SECRET_ACCESS_KEY=98a06891...
  R2_ENDPOINT_URL=https://61ef6f7c6215df3616424def03fa7070.r2.cloudflarestorage.com
  R2_BUCKET_NAME=<tên bucket>
  ```
  > Cấu trúc biến R2 này đã được chuẩn hóa ở initiative `refactor-env-config` — bám theo cùng tên biến.
- **Supabase URL + anon key** → `.env` của Expo (biến `EXPO_PUBLIC_*`, an toàn để lộ client).
- **Supabase service_role key** (dùng cho crawler ghi DB) → CHỈ đặt ở `.env` của crawler / secret VPS, **KHÔNG bao giờ** để trong app Expo hay biến `EXPO_PUBLIC_*`.

### 3. Xác nhận lịch sử git sạch
```bash
git log --all --full-history -- api.txt   # phải rỗng
git ls-files | grep -i api.txt            # phải rỗng
```
Nếu có kết quả → secret đã lọt vào history → cần rotate bắt buộc + có thể phải `git filter-repo`.

### 4. Làm sạch api.txt
Xóa key/secret khỏi `api.txt`, chỉ giữ lại link dashboard (không nhạy cảm) để tiện tra cứu. Hoặc xóa hẳn file.

### 5. Nhắc user (không tự làm được)
- Rotate **R2 API token** tại Cloudflare dashboard nếu file từng được mở/share ngoài máy local.
- Rotate **Supabase keys** tương tự nếu nghi ngờ.

## Tiêu chí hoàn thành
- `api.txt` trong `.gitignore`, không chứa secret.
- Secret nằm đúng ở `.env` (client) / `supabase/.env.local` / `.env` crawler (backend).
- Xác nhận git history không chứa secret.

## ⚠️ Lưu ý cho AI triển khai
- **KHÔNG** in secret ra log/PR/commit message.
- **KHÔNG** commit bất kỳ file `.env` nào.
- service_role key có toàn quyền DB — xử lý như mật khẩu tối cao.
