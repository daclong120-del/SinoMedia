Dashboard (frontend)          Supabase (database)           VPS (backend)
┌──────────────┐             ┌──────────────┐             ┌──────────────────┐
│  Người dùng  │──tạo task──▶│ crawler_tasks │◀──poll 5s──│ crawler-pipeline │
│  bấm "Crawl" │             │   (pending)   │             │  (queue worker)  │
└──────────────┘             └──────────────┘             └──────────────────┘
                                    ▲                            │
                                    │                            │
                                    └───── lưu kết quả ──────────┘

### 1. Ngôn ngữ sử dụng

* **TypeScript / JavaScript**: Được sử dụng cho toàn bộ Client App (Expo/React Native), các API, Edge Functions và mã nguồn crawler của `crawler-pipeline`.

* **SQL (PostgreSQL)**: Được sử dụng để viết mã cấu trúc bảng, RLS (Row Level Security) và trigger trong các file migration tại thư mục `supabase/migrations/`.



### 2. Frameworks & Công nghệ lõi

* **Frontend Client**: **Expo (React Native)** hỗ trợ đa nền tảng (iOS, Android, Web). Sử dụng hệ thống định tuyến dạng thư mục `Expo Router` (đặt tại `src/app/`) và style bằng `Tailwind CSS / NativeWind`.

* **Backend (BaaS)**: **Supabase** xử lý phần `Auth` (Quản lý phiên đăng nhập), cơ sở dữ liệu `Postgres`, và chạy serverless qua `Edge Functions`.

* **Media Storage**: **Cloudflare R2** (tương thích AWS S3 API) được dùng để lưu trữ file tĩnh, hình ảnh và video với chi phí băng thông tải xuống miễn phí ($0 Egress Fee).

* **Crawler Engine**: Nằm trong thư mục `crawler-pipeline/`, sử dụng **TypeScript** kết hợp với thư viện `impit` (giả lập TLS/JA3 Fingerprint của Chrome) và **Playwright** (`CloakBrowser` vá mã nguồn C++ để ẩn danh).



### 3. Kiến trúc hệ thống

Hệ thống kết hợp 2 mô hình kiến trúc cốt lõi:



#### A. Kiến trúc Client - Serverless - Database

Phần ứng dụng giao diện tách biệt hoàn toàn khỏi hệ thống lưu trữ và máy chủ backend:

`📱 Expo Client App (src/app)` -> `🔐 Supabase Auth` (Xác thực người dùng) / `🗄️ Supabase Postgres` (Truy vấn DB) / `📦 Cloudflare R2` (Upload/Download Media qua Presigned URL).



#### B. Kiến trúc cào dữ liệu lai (Hybrid Crawler Architecture)

Hệ thống crawler được tách thành 2 tầng hoạt động để tối ưu hiệu năng và tránh bị khóa (ban):

* **Sign Service (Tầng Trình Duyệt)**: Chạy `CloakBrowser` nặng để vượt qua các lớp bảo vệ chống bot (Cloudflare, CAPTCHA) nhằm mục đích đăng nhập và sinh chữ ký bảo mật (`a_bogus`, `msToken`, `ttwid` của Douyin/TikTok).

* **Crawl Workers (Tầng HTTP Request)**: Sử dụng các request HTTP siêu nhẹ thông qua thư viện `impit` spoof JA3 để cào hàng loạt dữ liệu (danh sách video, chi tiết, bình luận) bằng chữ ký và cookie lấy từ Sign Service.

* **Điểm giao của Crawler và Expo App**:

  `🕷️ Crawler` -> Ghi dữ liệu & Media -> `Supabase DB / Cloudflare R2` <- Đọc dữ liệu hiển thị <- `📱 Expo App`.