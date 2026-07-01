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
├── docs/                      # Tài liệu dự án
│   └── architecture.md        # Tài liệu kiến trúc và thư mục này
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
│   │   │   └── account.tsx    # Tab Account: Cập nhật thông tin tài khoản
│   │   ├── _layout.tsx        # File Layout gốc: Quản lý chuyển hướng Auth/Tabs
│   │   └── +not-found.tsx     # Màn hình hiển thị lỗi 404 (Không tìm thấy trang)
│   ├── components/            # Các UI Component tái sử dụng (Button, Input, Card...)
│   ├── constants/             # Chứa màu sắc, cấu hình font, kích thước chung của ứng dụng
│   └── utils/                 # Các hàm tiện ích dùng chung (định dạng ngày tháng, tiền tệ...)
├── supabase/                  # Cấu hình backend Supabase chạy local và cloud
│   ├── migrations/            # Các tệp SQL cấu hình Database (Tables, RLS, Triggers)
│   └── config.toml            # File cấu hình hoạt động của Supabase CLI local
├── .env                       # File cấu hình biến môi trường của dự án Expo (không commit)
├── .env.example               # File cấu hình mẫu biến môi trường
├── app.json                   # Cấu hình ứng dụng Expo (Tên app, logo, phiên bản, Expo Web...)
├── babel.config.js            # Cấu hình biên dịch mã nguồn của Babel
├── global.css                 # File định nghĩa CSS toàn cục (Tailwind/NativeWind)
├── metro.config.js            # Cấu hình trình đóng gói mã nguồn (Bundler) của Metro
├── package.json               # Khai báo thư viện phụ thuộc và câu lệnh chạy dự án (scripts)
├── tailwind.config.js         # Cấu hình các lớp CSS của Tailwind
└── tsconfig.json              # Cấu hình trình biên dịch TypeScript
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
