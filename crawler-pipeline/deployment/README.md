# Hướng dẫn triển khai Crawler Pipeline lên VPS 2GB RAM

Thư mục này chứa toàn bộ các tệp tin kịch bản và cấu hình để chạy hệ thống cào dữ liệu ổn định lâu dài trên máy chủ ảo Linux (Ubuntu/Debian) cấu hình thấp.

---

## Các bước cài đặt chi tiết

### Bước 1: Đồng bộ mã nguồn lên VPS
Sao chép thư mục `crawler-pipeline` từ máy local của bạn lên thư mục `/opt/crawler-pipeline` trên VPS bằng rsync hoặc scp:
```bash
rsync -avz --exclude 'node_modules' --exclude 'output' ./crawler-pipeline root@YOUR_VPS_IP:/opt/
```

### Bước 2: Thiết lập Swap 4GB (Quan trọng nhất)
Chạy script cấu hình Swap để tạo phân vùng nhớ đệm, ngăn chặn tình trạng máy chủ bị tràn RAM và tự động tắt (OOM-kill) khi trình duyệt khởi chạy:
```bash
cd /opt/crawler-pipeline/deployment
chmod +x setup-swap.sh
./setup-swap.sh
```

### Bước 3: Cài đặt Node.js và các gói phụ thuộc
Cài đặt phiên bản Node.js tối thiểu v18 và tải các package cần thiết:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

cd /opt/crawler-pipeline
npm install
npx playwright install chromium --with-deps
```

### Bước 4: Thiết lập biến môi trường
Tạo tệp `/opt/crawler-pipeline/.env` chứa đầy đủ thông tin kết nối Supabase và Cloudflare R2 giống như file `.env` cục bộ của bạn:
```ini
INTERNAL_API_URL="http://your_dashboard_domain_or_ip:3000"
API_TOKEN="your_secure_api_token"
EXPO_PUBLIC_SUPABASE_URL="https://ejwqyycoycyzuxseecck.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key_here"
R2_ACCESS_KEY_ID="your_r2_access_key"
R2_SECRET_ACCESS_KEY="your_r2_secret"
R2_ENDPOINT_URL="https://61ef6f7c6215df3616424def03fa7070.r2.cloudflarestorage.com"
R2_BUCKET_NAME="media-crawler-bucket"
```
*(Lưu ý: Tuyệt đối không cấu hình `SUPABASE_SERVICE_ROLE_KEY` ở Worker, mọi request phải đi qua Token Guard của Dashboard Next.js.)*

### Bước 5: Cấu hình Systemd Services
Sao chép và kích hoạt các dịch vụ hệ thống của systemd:

```bash
# Di chuyển các file dịch vụ vào thư mục hệ thống
sudo cp /opt/crawler-pipeline/deployment/crawler.service /etc/systemd/system/
sudo cp /opt/crawler-pipeline/deployment/crawler-refresh.service /etc/systemd/system/
sudo cp /opt/crawler-pipeline/deployment/crawler-refresh.timer /etc/systemd/system/

# Tải lại cấu hình systemd
sudo systemctl daemon-reload

# Chạy và kích hoạt bộ hẹn giờ tự động làm mới cookie (3 giờ/lần)
sudo systemctl enable --now crawler-refresh.timer

# Chạy và kích hoạt dịch vụ crawl worker chính
sudo systemctl enable --now crawler.service
```

---

## Quản lý và Giám sát

- **Xem nhật ký hoạt động (Logs) của worker:**
  ```bash
  journalctl -u crawler.service -f -n 100
  ```

- **Xem nhật ký quá trình làm mới cookie:**
  ```bash
  journalctl -u crawler-refresh.service -n 50
  ```

- **Kiểm tra trạng thái bộ hẹn giờ làm mới cookie:**
  ```bash
  systemctl status crawler-refresh.timer
  ```

- **Kích hoạt làm mới cookie thủ công ngay lập tức:**
  ```bash
  sudo systemctl start crawler-refresh.service
  ```
