# Phase 4 — HTTP Crawl Workers + Ghi Supabase & Upload R2

## Mục tiêu
Phần "cày" chính: dùng `curl_cffi` (spoof TLS/JA3) + cookie/sign đã có để cào khối lượng lớn, upload media lên R2, upsert vào Supabase. Đây là phần chạy 90–95% thời gian, phải nhẹ.

## 1. HTTP client (crawl/client.py)
BẮT BUỘC `curl_cffi` để spoof JA3 — KHÔNG dùng `requests`/`httpx` trần (TLS lộ ngay dù sign đúng).

```python
from curl_cffi import requests

def make_session(cookies, proxy):
    s = requests.Session(impersonate="chrome")   # giả JA3 + header order của Chrome
    s.proxies = {"http": proxy, "https": proxy}
    for c in cookies:
        s.cookies.set(c["name"], c["value"], domain=c["domain"])
    return s
```

## 2. Sinh chữ ký cho từng request (crawl + sign/js_sign.py)
Chữ ký kiểu `a_bogus`/`X-s`/`X-t` thường tính theo (url + params + timestamp) → cần sinh cho MỖI request.

**Hướng ưu tiên (nhẹ):** port hàm sign ra Node/PyExecJS, gọi tại chỗ trong worker:
```python
import execjs
_ctx = execjs.compile(open("sign/a_bogus.js").read())   # đoạn JS trích từ Phase 3

def sign_params(url, params, user_agent):
    return _ctx.call("sign", url, params, user_agent)
```
> Đây là chìa khóa để VPS 2GB chạy khỏe — steady-state KHÔNG mở browser.

**Fallback (nặng):** nếu không port được, gọi lại Sign Service (browser) — chỉ khi bất khả kháng.

## 3. Luồng cào (crawl/douyin.py)
```
lấy session (cookie) → sign_params(list_url) → GET list
   → với mỗi item: sign_params(detail_url) → GET detail
      → download media bytes → upload R2 → thu URL
      → upsert vào Supabase
   → sang trang tiếp / dừng theo rate limit
```
- Concurrency thấp trên 2GB: **2–4 luồng** (asyncio hoặc thread pool nhỏ).
- Retry + exponential backoff khi gặp `verify`/429/rỗng.

## 4. Upload R2 (store/r2_uploader.py)
```python
import boto3
s3 = boto3.client("s3",
    endpoint_url=R2_ENDPOINT_URL,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY)

def upload(platform, platform_id, filename, data, content_type):
    key = f"{platform}/{platform_id}/{filename}"
    s3.put_object(Bucket=R2_BUCKET_NAME, Key=key, Body=data, ContentType=content_type)
    return f"{R2_PUBLIC_BASE}/{key}"   # hoặc signed URL
```

## 5. Ghi Supabase (store/supabase_writer.py)
Dùng **service_role key** (bypass RLS). Upsert theo `on_conflict` để chống trùng:
```python
import httpx
def upsert_posts(rows):
    httpx.post(
        f"{SUPABASE_URL}/rest/v1/crawled_posts",
        params={"on_conflict": "platform,platform_id"},
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        },
        json=rows,
    )
```

## 6. Xoay proxy & account
- `proxy_pool.py`: vòng quay residential proxy, gắn với account.
- `account_pool.py`: mỗi account 1 profile CloakBrowser riêng; theo dõi rate limit/ngày → nghỉ account khi chạm ngưỡng.

## Tiêu chí hoàn thành
- Cào được list + detail của nền tảng đích, có sign hợp lệ.
- Media lên R2, URL lưu vào `media_urls`.
- Upsert Supabase không tạo bản ghi trùng.
- Xoay proxy/account + backoff hoạt động.

## Lưu ý
- Đừng lưu media vào Postgres — chỉ lưu URL R2.
- Lưu `raw` (jsonb) để về sau đổi schema không phải cào lại.
