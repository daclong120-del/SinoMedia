# 🕷️ Kiến Trúc Lai Cào Dữ Liệu: CloakBrowser + HTTP Request

Tài liệu này mô tả kiến trúc tối ưu để cào dữ liệu các nền tảng có chống bot nghiêm ngặt (**Douyin, TikTok, Tiểu Hồng Thư / 小红书**), kết hợp giữa **CloakBrowser** (trình duyệt tàng hình) và **HTTP request** (cào khối lượng lớn).

---

## 🎯 1. Nguyên Tắc Vàng

> **CloakBrowser làm việc "khó nhưng ít" — HTTP làm việc "dễ nhưng nhiều".**
>
> Browser chỉ chạm vào 2 thứ đắt đỏ: **vượt detect** và **sinh chữ ký/cookie**. Mọi thứ còn lại (cào list, detail, comment, lưu DB) đều để HTTP lo.

Lý do: 1 chữ ký/cookie hợp lệ dùng được cho **rất nhiều request** trước khi hết hạn. Nên browser chỉ cần chạy loáng thoáng (~5–10% công việc), còn 90–95% khối lượng là HTTP → có được **tốc độ HTTP + độ an toàn của browser**.

---

## 🧱 2. Bối Cảnh: Hai Bức Tường Cần Vượt

Nhiều người nhầm rằng chỉ cần "xoay proxy + account" là cào được. Thực ra có **2 bức tường tách biệt**:

| Bức tường | Bản chất | Giải pháp |
|---|---|---|
| **1. Phát hiện bot** | Fingerprint (canvas/WebGL/fonts), Cloudflare, reCAPTCHA, phát hiện automation (`navigator.webdriver`, dấu vết CDP) | CloakBrowser (vá tầng C++, là browser thật) |
| **2. Chữ ký (signature)** | Mỗi request API bắt buộc kèm chữ ký sinh từ JS mã hóa | Sinh bằng browser, tái dùng qua HTTP |

**Quan trọng:** Xoay proxy/account **chỉ phá được bức tường rate-limit/khóa account**, KHÔNG giải quyết được chữ ký. Thiếu chữ ký → server trả rỗng ngay, bất kể IP hay account.

Bảng tham số chữ ký bắt buộc theo nền tảng:

| Nền tảng | Tham số chữ ký |
|---|---|
| Douyin / TikTok (web) | `a_bogus` / `X-Bogus`, `_signature`, `msToken`, `ttwid` |
| TikTok (app API) | `X-Gorgon`, `X-Khronos`, `X-Argus` |
| Tiểu Hồng Thư (小红书) | `X-s`, `X-t`, `X-s-common` |

---

## 🗺️ 3. Sơ Đồ Kiến Trúc

```text
┌─────────────────────────────────────────────────────────┐
│  TẦNG 1 — SIGN SERVICE  (CloakBrowser, chạy ÍT, nặng)      │
│  VPS 4GB · 1–2 instance · headless=False + proxy resi     │
│                                                            │
│   • Login (qua Cloudflare/captcha/QR) 1 lần                │
│   • launch_persistent_context → giữ session, khỏi login lại│
│   • page.evaluate(): gọi hàm sign JS của trang             │
│        → trả về a_bogus / X-s / X-t / msToken / ttwid      │
│   • Lấy + refresh cookie định kỳ                           │
│   • Expose ra 1 API nội bộ:  POST /sign  { url, params }   │
│        → { signature, cookie, headers }                    │
└───────────────────────────┬───────────────────────────────┘
                            │ (gọi khi cần chữ ký mới)
                            ▼
┌─────────────────────────────────────────────────────────┐
│  TẦNG 2 — CRAWL WORKERS  (httpx/curl_cffi, chạy NHIỀU, nhẹ)│
│  VPS 1GB cũng chạy được · scale ngang thoải mái            │
│                                                            │
│   • Xin chữ ký từ Sign Service (cache lại, tái dùng)       │
│   • curl_cffi impersonate="chrome" → spoof TLS/JA3         │
│   • Cào list → detail → comment  (khối lượng lớn)          │
│   • Xoay proxy + xoay account theo rate limit              │
│   • Lưu thẳng vào DB                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 4. Phân Vai: Ai Xử Lý Bức Tường Nào

| Bức tường | Ai xử lý | Ghi chú |
|---|---|---|
| Detect bot (fingerprint, Cloudflare, captcha) | **CloakBrowser** | Chỉ lúc login/sign, không phải mọi request |
| Chữ ký JS | **CloakBrowser sinh → HTTP tái dùng** | 1 lần sinh, nhiều lần dùng |
| TLS/JA3 khi request | **`curl_cffi impersonate`** | Giả JA3 Chrome, không cần browser |
| Rate limit / khóa account | **Tầng 2 xoay proxy + account** | Bài toán tần suất |
| Khối lượng lớn | **HTTP** | Nhẹ, nhanh, rẻ, scale ngang |

---

## ⚙️ 5. Quyết Định Kỹ Thuật Quan Trọng

1. **Chữ ký sống được bao lâu?** — Yếu tố quyết định độ nặng của hệ thống:
   - `msToken` / `ttwid` / cookie: sống lâu (giờ → ngày) → refresh thưa.
   - `a_bogus` / `X-s` / `X-t`: thường **tính theo từng request** (gồm url + timestamp) → nên **port hàm sign đó ra chạy bằng Node / `PyExecJS`** ngay trong Tầng 2 để khỏi gọi browser mỗi lần. Browser chỉ dùng để *trích được đoạn JS sign* ban đầu.

2. **Bắt buộc dùng `curl_cffi`** (hoặc `tls-client`), KHÔNG dùng `requests` / `httpx` trần — vì phải spoof JA3. Nếu không, TLS fingerprint lộ ngay dù chữ ký đúng.

3. **Tách Sign Service ra process/máy riêng** với crawl workers → browser crash không kéo sập cả hệ thống, và scale 2 tầng độc lập.

4. **Persistent context + account pool**: mỗi account 1 profile riêng (cookie/localStorage), tránh dùng chung fingerprint.

5. **Cấu hình CloakBrowser nên bật** (theo README của tool):
   - `proxy="http://user:pass@residential:port"` — dùng residential IP, không dùng datacenter.
   - `geoip=True` — khớp timezone/locale với IP proxy.
   - `headless=False` — một số site vẫn phát hiện headless dù đã vá C++.
   - `humanize=True` — chuột/bàn phím/cuộn giống người thật (qua phát hiện hành vi).

---

## 💰 6. Chi Phí Thực Tế

| Thành phần | Cấu hình | Vai trò |
|---|---|---|
| VPS Sign Service | **4GB RAM** | Chạy CloakBrowser (1–2 instance) |
| VPS Crawl Workers | **1–2GB RAM** (hoặc chung máy) | Chạy HTTP workers |
| **Residential proxy** | — | ⚠️ **Tốn nhất**, cần cho cả login lẫn cào |
| **Account pool** | — | Nuôi/mua account tránh bị khóa |

**Lưu ý về RAM:** VPS 1GB **KHÔNG đủ** để chạy CloakBrowser (Chromium base ~300–400MB + mỗi tab load trang nặng +300MB→1GB + Xvfb + OS → dễ OOM crash). Nhắm **tối thiểu 2GB, khuyến nghị 4GB** cho tầng browser.

> Chi phí đắt đỏ nằm ở **proxy + account**, không phải VPS. So với "full CloakBrowser cho mọi request", kiến trúc lai này **rẻ hơn nhiều lần và nhanh hơn nhiều lần**, mà vẫn qua được detect.

---

## 💸 7. Chạy Trên MỘT VPS 2GB Duy Nhất (Ngân Sách Hạn Chế)

Khi chỉ có kinh phí cho **1 con VPS 2GB**, vẫn chạy được — nhưng phải theo kỷ luật nghiêm ngặt: **KHÔNG để browser chạy thường trực.** Chìa khóa là browser chỉ "nhá" lên làm việc nặng rồi tắt ngay, nhường RAM cho HTTP.

### Chiến lược: Browser và HTTP KHÔNG chạy cùng lúc ở mức cao

```text
┌──────────── VPS 2GB (duy nhất) ─────────────┐
│                                              │
│  [Giai đoạn A] Browser bật (nặng, ngắn hạn)  │
│    • CloakBrowser login + lấy cookie/msToken │
│    • Trích đoạn JS sign 1 lần                 │
│    • → LƯU cookie + sign function ra file/DB  │
│    • → ĐÓNG browser ngay (giải phóng ~1GB)    │
│                                              │
│  [Giai đoạn B] Chỉ HTTP (nhẹ, chạy 95% t.gian)│
│    • curl_cffi + cookie đã lưu               │
│    • sinh chữ ký bằng Node/PyExecJS tại chỗ   │
│    • cào list/detail/comment → lưu DB         │
│                                              │
│  Browser chỉ bật lại khi cookie hết hạn       │
│  (vài giờ/lần, không phải mỗi request)        │
└──────────────────────────────────────────────┘
```

### Những thứ BẮT BUỘC làm để không crash

**1. Thêm swap 4GB** — phao cứu sinh, làm ngay đầu tiên:
```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
Chậm hơn RAM thật, nhưng cứu khỏi OOM-kill lúc browser phình.

**2. Port thuật toán sign ra Node / PyExecJS** — điểm quyết định. Nếu làm được, steady-state **gần như không cần browser** → 2GB dư sức chạy HTTP. Browser chỉ dùng để login + refresh cookie.

**3. Chặn tải tài nguyên thừa trong browser** (tiết kiệm RAM nhiều nhất):
```python
page.route("**/*", lambda route: route.abort()
    if route.request.resource_type in ["image", "media", "font", "stylesheet"]
    else route.continue_())
```

**4. Chỉ 1 tab, đóng browser ngay sau khi xong:**
```python
browser = launch(headless=True, proxy="...", geoip=True)
# ... login, lấy cookie, trích sign ...
browser.close()   # QUAN TRỌNG: giải phóng RAM ngay
```

### Đánh đổi phải chấp nhận trên 2GB

| Muốn tiết kiệm RAM | Đánh đổi |
|---|---|
| `headless=True` (thay vì `False`) | Tiết kiệm ~200MB nhưng **dễ bị detect hơn** — chỉ dùng nếu site không soi headless |
| Chặn ảnh/media/css | Không xem được ảnh trong browser (nhưng cào URL ảnh qua HTTP vẫn được) |
| Browser không chạy thường trực | Cookie/session refresh trễ hơn — chấp nhận cào chậm hơn chút |
| HTTP workers concurrency thấp (2–4 luồng) | Throughput vừa phải, không dồn dập |

### Giới hạn thực tế của 2GB

- ✅ **Nếu port được sign ra JS engine** → 2GB **thoải mái**, browser gần như không chạy khi cào. Kịch bản lý tưởng.
- ⚠️ **Nếu KHÔNG port được, phải dùng browser sinh sign cho từng request** → 2GB **rất chật**: chỉ 1 instance, 1 account, tốc độ thấp, phụ thuộc nặng vào swap.
- ❌ **`headless=False` + nhiều account song song trên 2GB** → sẽ crash, không khả thi.

> **Yếu tố quyết định 2GB "chạy khỏe" hay "chật vật" chính là: có port được hàm sign ra Node/PyExecJS hay không.** Ưu tiên tìm thư viện open-source đã port sẵn thuật toán sign của nền tảng (ví dụ `a_bogus` của TikTok/Douyin đã có nhiều lib Python/JS) để giảm tối đa việc phải mở browser.

---

## ✅ 8. Khi Nào Dùng Kiến Trúc Nào

| Tình huống | Phương án |
|---|---|
| API đơn giản, **không ép chữ ký JS** | **HTTP request thuần** — VPS 1GB, xoay proxy/account là đủ |
| Douyin/TikTok/XHS, cần **throughput lớn** | **Kiến trúc lai** (tài liệu này) — điểm ngọt |
| Douyin/TikTok/XHS, cần **chắc ăn, ít bảo trì**, data vừa phải | **Full CloakBrowser** — an toàn nhất nhưng nặng & tốn phí |

---

## 📝 9. Tóm Tắt Một Dòng

> Không có viên đạn bạc. **CloakBrowser giỏi giấu mình, HTTP giỏi cào nhanh & rẻ.** Ghép lại: browser lo cửa vào (login + sinh chữ ký), HTTP lo khối lượng lớn (cào + lưu DB) → tối ưu cả về **độ an toàn** lẫn **chi phí**.

---

## 🔗 Tham Khảo

- CloakBrowser: https://github.com/CloakHQ/CloakBrowser
- `curl_cffi` (spoof TLS/JA3): https://github.com/lexiforest/curl_cffi
- Repo tham chiếu trong workspace: `D:\Python\socialpeta-crawl`, `D:\Python\ChinaMediaCrawler`
