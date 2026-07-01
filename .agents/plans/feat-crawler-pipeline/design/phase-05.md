# Phase 5 — Deploy VPS 2GB (Swap, systemd, Kỷ Luật RAM)

## Bối cảnh
Ngân sách: **1 VPS 2GB RAM duy nhất**. Chạy được nhưng phải kỷ luật — KHÔNG để browser chạy thường trực.
> Chi tiết đầy đủ: [.agents/docs/crawler-hybrid-architecture.md](../../docs/crawler-hybrid-architecture.md) mục 7.

## Chiến lược 2 giai đoạn (không chạy cùng lúc ở mức cao)
```
[A] Browser bật ngắn hạn → login + sinh cookie/sign → lưu ra file → ĐÓNG (giải phóng ~1GB)
[B] Chỉ HTTP chạy 95% thời gian → curl_cffi + cookie đã lưu + sign bằng Node/PyExecJS → cào
Browser chỉ bật lại khi cookie hết hạn (vài giờ/lần).
```

## Việc cần làm

### 1. Swap 4GB (làm đầu tiên — phao chống OOM)
```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Cài đặt runtime
- Python 3.11+, Node.js (cho PyExecJS/js_sign), dependencies Phase 3.
- CloakBrowser sẽ tự tải binary Chromium (~200MB) lần chạy đầu.
- Nếu dùng `headless=False`: cài `xvfb` và chạy qua `xvfb-run`.

### 3. Chặn tải tài nguyên nặng
Đã cấu hình `page.route(... abort image/media/font/stylesheet)` ở Phase 3 — xác nhận bật khi chạy production.

### 4. systemd / supervisor
- **Sign Service**: chạy **on-demand** hoặc theo cron refresh (KHÔNG chạy liên tục).
  - Ví dụ cron: refresh cookie mỗi 3–4 giờ.
- **Crawl workers**: service chạy nền liên tục, concurrency 2–4.

Ví dụ unit crawl worker (`/etc/systemd/system/crawler.service`):
```ini
[Unit]
Description=Crawl workers (HTTP)
After=network.target

[Service]
WorkingDirectory=/opt/crawler
ExecStart=/opt/crawler/.venv/bin/python main.py
Restart=on-failure
RestartSec=10
MemoryMax=1500M        # chặn worker HTTP phình quá, chừa RAM cho browser lúc [A]
EnvironmentFile=/opt/crawler/.env

[Install]
WantedBy=multi-user.target
```

Cron refresh sign (crontab):
```
0 */3 * * * /opt/crawler/.venv/bin/python -m sign.browser_sign >> /var/log/crawler-sign.log 2>&1
```

### 5. Giám sát
- Log RAM: `free -m`, cảnh báo khi swap dùng nhiều.
- `dmesg | grep -i oom` để bắt OOM-kill.
- Đảm bảo browser luôn `close()` — kiểm tra không có tiến trình chromium mồ côi (`pgrep chrome`).

## Giới hạn thực tế (đặt kỳ vọng đúng)
- ✅ Port được sign ra JS → 2GB thoải mái (browser gần như không chạy khi cào).
- ⚠️ Không port được, browser sinh sign mỗi request → 2GB chật: 1 instance, 1 account, tốc độ thấp.
- ❌ `headless=False` + nhiều account song song → crash.

## Tiêu chí hoàn thành
- Swap hoạt động; không OOM khi bật browser giai đoạn [A].
- Crawl workers chạy nền ổn định qua systemd, tự restart khi lỗi.
- Không còn tiến trình chromium mồ côi.
- Có log giám sát RAM + tiến độ cào.
