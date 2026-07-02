# 🏗️ Kiến Trúc Hệ Thống & Cấu Trúc Thư Mục Chi Tiết

Tài liệu này cung cấp cái nhìn toàn diện về kiến trúc hệ thống, sơ đồ luồng dữ liệu và ý nghĩa của từng thư mục, tệp tin quan trọng trong dự án **Expo + Supabase + Cloudflare R2**.

---

## 🗺️ 1. Sơ Đồ Kiến Trúc Tổng Quan

Dự án tuân theo mô hình Client-Serverless-Database hiện đại, tách biệt hoàn toàn giao diện người dùng và các hệ thống lưu trữ dữ liệu:

```text
            +-----------------------------------------------+
            |            📱 EXPO CLIENT (src/app)           |
            |         React Native & Web App Frontend       |
            +-------+---------------+---------------+-------+
                    |               |               |
         (1) Đăng ký|    (2) Truy vấn|    (3) Upload /|
          Đăng nhập |        dữ liệu|       Download |
                    |               |        ảnh/video|
                    v               v               v
            +-------+-------+   +---+---+   +-------+-------+
            |  🔐 SUPABASE  |   | 🗄️ DB |   | 📦 CLOUDFLARE |
            |      AUTH     |   | (Post |   |      R2       |
            | (User Session)|   | gres) |   | (Lưu trữ file)|
            +---------------+   +---+---+   +---------------+
```

---

## 📂 2. Cấu Trúc Thư Mục Chi Tiết

Dưới đây là sơ đồ hình cây của toàn bộ dự án và chức năng cụ thể của từng phần:

```
expo-supabase-ai-template/
├── .agents/                   # Nhật ký hoạt động và kế hoạch của AI Agents
├── assets/                    # Tài nguyên tĩnh của ứng dụng (logo, hình ảnh, splash screen)
├── context/                   # Quản lý trạng thái toàn cục của React
│   └── SessionProvider.tsx    # Cung cấp phiên đăng nhập (session) cho toàn bộ app
├── lib/                       # Khởi tạo các thư viện dùng chung
│   └── supabase.ts            # Khởi tạo Supabase Client (đã cấu hình bộ nhớ lưu trữ an toàn)
├── src/                       # Thư mục mã nguồn chính của ứng dụng Expo
│   ├── app/                   # Expo Router (Hệ thống định tuyến dạng thư mục)
│   │   ├── (auth)/            # Nhóm màn hình xác thực (Chưa đăng nhập)
│   │   │   ├── _layout.tsx    # Định dạng layout màn hình auth
│   │   │   └── index.tsx      # Màn hình Đăng nhập / Đăng ký (Có sẵn Dev Bypass)
│   │   ├── (tabs)/            # Nhóm màn hình chính sau khi đăng nhập
│   │   │   ├── _layout.tsx    # Định dạng thanh Tab Bar phía dưới ứng dụng
│   │   │   ├── index.tsx      # Tab Home: Bảng điều khiển (Dashboard)
│   │   │   ├── feed.tsx       # Tab Feed: Danh sách video/bài đăng
│   │   │   ├── account.tsx    # Tab Account: Cập nhật thông tin tài khoản
│   │   │   └── openai.tsx     # Tab AI: Chat với AI
│   │   ├── post/
│   │   │   └── [id].tsx       # Màn hình chi tiết bài đăng
│   │   ├── _layout.tsx        # File Layout gốc: Quản lý chuyển hướng Auth/Tabs
│   │   ├── modal.tsx          # Modal toàn cục
│   │   └── +not-found.tsx     # Màn hình hiển thị lỗi 404 (Không tìm thấy trang)
│   ├── components/            # Các UI Component tái sử dụng (Button, Input, Card...)
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts         # Hook xác thực — trạng thái session + login/logout
│   │   └── usePosts.ts        # Hook truy vấn posts — phân trang, lọc platform
│   ├── services/              # Tầng giao tiếp dữ liệu (Supabase/R2 queries)
│   │   ├── auth.service.ts    # Các thao tác Supabase Auth
│   │   ├── post.service.ts    # CRUD posts/comments/authors
│   │   └── media.service.ts   # Tương tác Cloudflare R2 (presigned URL)
│   ├── types/                 # TypeScript type definitions cho app
│   │   ├── post.ts            # Post, Comment, Author types
│   │   ├── auth.ts            # User, Session types
│   │   └── navigation.ts     # Route params types
│   ├── constants/             # Chứa màu sắc, cấu hình font, kích thước chung của ứng dụng
│   └── utils/                 # Các hàm tiện ích dùng chung (định dạng ngày tháng, tiền tệ...)
│
├── crawler-pipeline/          # 🕷️ Crawler Engine (chạy tách biệt trên VPS)
│   └── src/
│       ├── base/              # Abstract interfaces — hợp đồng chung cho mọi platform
│       │   ├── base_crawler.ts    # ICrawler: start(), search(), launchBrowser()
│       │   ├── base_client.ts     # IApiClient: request(), updateCookies()
│       │   ├── base_store.ts      # IStore: storeContent(), storeComment(), storeCreator()
│       │   └── base_login.ts      # ILogin: begin(), loginByQrcode(), loginByCookies()
│       ├── config/            # Cấu hình phân tầng: base + override per platform
│       │   ├── base.config.ts     # Config chung: headless, proxy, crawlType
│       │   └── douyin.config.ts   # Config riêng Douyin: maxPage, sortType
│       ├── constant/          # Enums và hằng số dùng chung
│       │   └── index.ts           # PlatformType, CrawlType, SortType, MediaType
│       ├── crawl/             # Logic cào dữ liệu theo platform
│       │   ├── client.ts          # DouyinClient — HTTP via impit + CloakBrowser fallback
│       │   └── douyin.ts          # DouyinCrawler — orchestrator: detail, creator, search
│       ├── model/             # Type definitions cho dữ liệu cào
│       │   ├── douyin.ts          # DouyinAweme, DouyinComment types
│       │   └── storage.ts         # CrawledPostRow, R2/Supabase types
│       ├── sign/              # Signature & session management
│       │   ├── browser_sign.ts    # Bootstrap session qua CloakBrowser
│       │   ├── js_sign.ts         # Sinh a_bogus bằng Node.js engine
│       │   ├── session_store.ts   # Lưu/đọc session từ file
│       │   └── douyin.js          # Script sinh chữ ký a_bogus
│       ├── store/             # Tầng lưu trữ: Supabase DB + Cloudflare R2
│       │   ├── supabase_writer.ts # Ghi dữ liệu vào Supabase DB
│       │   └── r2_uploader.ts     # Upload media lên Cloudflare R2
│       ├── proxy/             # Quản lý proxy pool
│       │   ├── proxy_pool.ts      # Xoay vòng proxy, health check
│       │   └── types.ts           # ProxyInfo, ProxyProvider types
│       ├── utils/             # Tiện ích dùng chung cho crawler
│       │   ├── browser.ts         # Browser context utilities
│       │   ├── crawler.ts         # Retry, user-agent rotation, URL helpers
│       │   └── time.ts            # Sleep, timestamp, duration format
│       ├── index.ts           # Entry point + CLI command dispatcher
│       └── config.ts          # Config loader (.env)
│
├── supabase/                  # Cấu hình backend Supabase chạy local và cloud
│   ├── migrations/            # Các tệp SQL cấu hình Database (Tables, RLS, Triggers)
│   └── config.toml            # File cấu hình hoạt động của Supabase CLI local
├── .env                       # File cấu hình biến môi trường (không commit)
├── .env.example               # File cấu hình mẫu biến môi trường
├── app.json                   # Cấu hình ứng dụng Expo (Tên app, logo, phiên bản)
├── babel.config.js            # Cấu hình biên dịch Babel
├── global.css                 # CSS toàn cục (Tailwind/NativeWind)
├── metro.config.js            # Cấu hình bundler Metro
├── package.json               # Thư viện phụ thuộc và scripts
├── tailwind.config.js         # Cấu hình Tailwind
└── tsconfig.json              # Cấu hình TypeScript
```

---

## 🛠️ 3. Chi Tiết Các Tệp Tin Cấu Hình Quan Trọng

### 🔑 `lib/supabase.ts`
*   Khởi tạo đối tượng kết nối `supabase` để gọi dữ liệu ở mọi nơi trong ứng dụng.
*   Chứa cấu hình `customStorage` thông minh: Tự động dùng `localStorage` trên môi trường Web/SSR và dùng `AsyncStorage` trên thiết bị di động (iOS/Android).

### 🛡️ `src/app/_layout.tsx`
*   Đây là **"Trạm gác cổng"** của ứng dụng.
*   Nó sẽ lắng nghe biến `session` từ `SessionProvider`. 
*   Nếu `session = null` (chưa đăng nhập), nó sẽ ép ứng dụng điều hướng về thư mục `(auth)` để yêu cầu đăng nhập.
*   Nếu `session` hợp lệ, nó cho phép người dùng vào khu vực `(tabs)` để sử dụng app.

---

## 🌐 4. Mô Hình Triển Khai Thực Tế (Deployment Model)

Trong thực tế phát triển phần mềm hiện đại, các cấu phần này sẽ được host ở các dịch vụ tối ưu nhất:

```
┌────────────────────────────────────────────────────────┐
│             Hạ tầng triển khai (Deployment)            │
├─────────────────┬───────────────────┬──────────────────┤
│    Frontend     │   Backend (BaaS)  │   Media Storage  │
├─────────────────┼───────────────────┼──────────────────┤
│ Vercel / Netlify│     Supabase      │  Cloudflare R2   │
│ (Tĩnh, CDN toàn │ (Auth, Database,  │ (Lưu trữ ảnh,    │
│  cầu, giá rẻ)   │  Edge Functions)  │  video, $0 Egress│
└─────────────────┴───────────────────┴──────────────────┘
```

### 1. Frontend trên Vercel hoặc Netlify
*   Các ứng dụng web Single Page (React/Next.js/Expo Web) sau khi build sẽ được đẩy lên Vercel/Netlify/Cloudflare Pages.
*   Những nền tảng này sử dụng mạng lưới phân phối nội dung (CDN) giúp trang web tải tức thì ở bất kỳ đâu trên thế giới và chịu được hàng triệu lượt truy cập đồng thời với chi phí tối thiểu.

### 2. Backend trên VPS so với Serverless (Supabase BaaS)
*   **Mô hình truyền thống (VPS)**: Bạn phải thuê một máy chủ ảo (ví dụ: Ubuntu trên DigitalOcean), cài đặt Node.js/Python, cấu hình Nginx, cài Docker, quản lý bảo mật cổng mạng (Ports), cấu hình backup database... 
*   **Mô hình hiện đại (BaaS - Supabase)**: Supabase cung cấp sẵn toàn bộ cơ sở hạ tầng được tối ưu hóa. Bạn không cần cấu hình VPS, không lo nâng cấp OS, việc mở rộng quy mô (Scale) và sao lưu cơ sở dữ liệu đều được tự động hóa hoàn toàn.

---

## 📦 5. Tại sao chọn Cloudflare R2 để lưu trữ Media?

Mặc dù Supabase có sẵn dịch vụ Storage (lưu trữ tệp tin), việc tích hợp **Cloudflare R2** cho các dự án thực tế là cực kỳ phổ biến vì lý do chi phí:

1.  **Phí Băng thông tải xuống (Egress Fees)**:
    *   Các dịch vụ lưu trữ thông thường (như AWS S3, Google Cloud Storage, Supabase Storage ở các gói lớn) đều tính phí truyền dữ liệu ra ngoài (ví dụ: cứ mỗi GB ảnh/video người dùng xem trên app, bạn phải trả khoảng $0.08 - $0.12).
    *   **Cloudflare R2 hoàn toàn miễn phí băng thông tải xuống ($0 Egress Fee)**. Bạn chỉ cần trả tiền thuê dung lượng lưu trữ tĩnh thực tế (khoảng $0.015/GB/tháng).
2.  **Tương thích hoàn toàn với AWS S3**:
    *   R2 hỗ trợ giao thức S3 API tiêu chuẩn, giúp việc tích hợp vào mã nguồn Node.js/Python/Edge Functions cực kỳ dễ dàng qua SDK AWS S3.
3.  **Cách hoạt động**:
    *   Khi ứng dụng cần tải lên một file lớn (ví dụ: Video 50MB):
        1. App gửi yêu cầu xin quyền tải file lên Edge Function.
        2. Edge Function sinh ra một **Presigned URL** (đường dẫn tải lên tạm thời có chữ ký bảo mật tồn tại trong 5-10 phút) từ Cloudflare R2 và gửi lại cho App.
        3. App sử dụng đường dẫn đó để tải trực tiếp file từ thiết bị lên Cloudflare R2 mà không cần đi qua Server trung gian, giúp tránh quá tải băng thông cho server.
