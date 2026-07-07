# 📑 Danh Sách Đặc Tả API - SinoMedia Dashboard

Tài liệu này liệt kê toàn bộ các API, truy vấn cơ sở dữ liệu (Supabase Client), hàm RPC, và các kết nối thời gian thực (Realtime) được sử dụng trong giao diện Dashboard của dự án **SinoMedia**.

---

## 🔌 1. Tổng Quan Kiến Trúc Gọi API
Frontend Dashboard (`dashboard`) sử dụng **Supabase JS SDK** để giao tiếp trực tiếp với cơ sở dữ liệu Supabase thông qua giao thức PostgREST HTTP ở chế độ client-side.
* **Supabase Client**: Cấu hình tại [supabase.ts](file:///d:/Python/SinoMedia/dashboard/lib/supabase.ts).
* **Data Access Layer**: Toàn bộ logic query được đóng gói tại [api.ts](file:///d:/Python/SinoMedia/dashboard/lib/api.ts).
* **Realtime**: Lắng nghe thay đổi dữ liệu thông qua WebSocket kênh `@supabase/supabase-js`.

---

## 🔐 2. API Authentication (Supabase Auth)
Nhóm API quản lý phiên đăng nhập và tài khoản người dùng, gọi trực tiếp các phương thức Auth của Supabase Client.

### 2.1 Đăng nhập (Sign In)
* **Phương thức SDK**: `supabase.auth.signInWithPassword({ email, password })`
* **Mục đích**: Xác thực người dùng bằng Email và Mật khẩu.
* **Payload đầu vào**:
  ```typescript
  {
    email: string,
    password: string
  }
  ```
* **Dữ liệu trả về**: Đối tượng Session chứa `access_token`, `refresh_token` và thông tin User.

### 2.2 Đăng ký (Sign Up)
* **Phương thức SDK**: `supabase.auth.signUp({ email, password })`
* **Mục đích**: Đăng ký tài khoản mới. Sau khi đăng ký thành công, Supabase Trigger sẽ tự động tạo bản ghi trong bảng `public.profiles`.
* **Payload đầu vào**:
  ```typescript
  {
    email: string,
    password: string
  }
  ```

### 2.3 Đăng xuất (Sign Out)
* **Phương thức SDK**: `supabase.auth.signOut()`
* **Mục đích**: Hủy phiên đăng nhập hiện tại và xóa token lưu trữ ở client.

---

## 📊 3. API Truy Vấn Dữ Liệu Thu Thập (Crawl Data)
Các API tương tác trực tiếp với các bảng chứa dữ liệu đã cào được từ các nền tảng mạng xã hội Trung Quốc (Douyin, XHS, Weibo, Zhihu, Bilibili, Kuaishou, Tieba).

### 3.1 Lấy danh sách bài viết (`crawled_posts`)
* **Tên hàm frontend**: `fetchPosts`
* **Phương thức**: GET (Truy vấn bảng `crawled_posts`)
* **Tham số lọc (Filters)**:
  * `platform` (optional): Lọc theo nền tảng (`Platform` enum).
  * `search` (optional): Tìm kiếm tương đối (`ilike`) theo trường `caption`.
  * `limit` (default: 50): Số lượng bản ghi tối đa.
  * `offset` (optional): Hỗ trợ phân trang bằng cách xác định dải range `.range(offset, offset + limit - 1)`.
* **Sắp xếp**: Mặc định sắp xếp theo `crawled_at` giảm dần (mới nhất lên đầu).
* **Dữ liệu trả về**: Mảng các đối tượng `CrawledPost`:
  ```typescript
  Array<{
    id: string;             // ID duy nhất của bài viết
    platform: Platform;     // douyin | bilibili | xhs | weibo | kuaishou | zhihu | tieba
    author_id: string;      // Khóa ngoại liên kết tới crawled_authors
    platform_uid: string;   // ID bài viết trên nền tảng gốc
    title: string;          // Tiêu đề bài đăng
    caption: string;        // Nội dung văn bản chi tiết
    cover_url: string;      // Ảnh bìa
    like_count: number;     // Lượt thích
    view_count: number;     // Lượt xem
    comment_count: number;  // Lượt bình luận
    media_urls: string[];   // Danh sách URL hình ảnh / video
    tags: string[];         // Các thẻ gắn kèm bài viết
    published_at: string;   // Thời gian đăng bài gốc
    crawled_at: string;     // Thời gian cào dữ liệu
  }>
  ```

### 3.2 Lấy danh sách tác giả (`crawled_authors`)
* **Tên hàm frontend**: `fetchAuthors`
* **Phương thức**: GET (Truy vấn bảng `crawled_authors`)
* **Tham số lọc (Filters)**:
  * `platform` (optional): Lọc theo nền tảng.
  * `search` (optional): Tìm kiếm tương đối (`ilike`) theo trường `nickname`.
  * `limit` (default: 50): Số lượng bản ghi tối đa.
* **Sắp xếp**: Mặc định sắp xếp theo `updated_at` giảm dần.
* **Dữ liệu trả về**: Mảng các đối tượng `CrawledAuthor`:
  ```typescript
  Array<{
    id: string;             // ID tác giả
    platform_uid: string;   // ID tác giả trên nền tảng gốc
    nickname: string;       // Biệt danh hiển thị
    platform: Platform;     // Nền tảng
    gender: 'male' | 'female' | 'unknown';
    description: string;    // Tiểu sử
    fans_count: number;     // Số lượng người theo dõi (Followers)
    follows_count: number;  // Số lượng đang theo dõi (Following)
    ip_location: string;    // Vị trí IP đăng nhập gần nhất
    avatar_url: string;     // Ảnh đại diện
    crawled_at: string;     // Thời điểm cào/cập nhật thông tin gần nhất
  }>
  ```

### 3.3 Lấy danh sách bình luận của bài viết (`crawled_comments`)
* **Tên hàm frontend**: `fetchComments`
* **Phương thức**: GET (Truy vấn bảng `crawled_comments`)
* **Tham số lọc (Filters)**:
  * `post_id` (required): Lọc chính xác các bình luận thuộc về ID bài viết này.
  * `limit` (default: 100): Giới hạn tối đa 100 bình luận.
* **Sắp xếp**: Sắp xếp theo `published_at` tăng dần (bình luận cũ nhất lên đầu).
* **Dữ liệu trả về**:
  ```typescript
  Array<{
    id: string;             // ID bình luận
    post_id: string;        // ID bài đăng liên kết
    parent_cid: string|null;// ID bình luận cha (nếu là bình luận phụ)
    content: string;        // Nội dung bình luận
    like_count: number;     // Số lượt thích bình luận
    created_at: string;     // Thời điểm viết bình luận
  }>
  ```

---

## ⚙️ 4. API Điều Khiển Crawler & Quản Lý Nhiệm Vụ (Task & Logs)
Nhóm API tương tác với scheduler/worker để điều phối hoạt động cào dữ liệu tự động.

### 4.1 Lấy danh sách nhiệm vụ cào (`crawler_tasks`)
* **Tên hàm frontend**: `fetchTasks`
* **Phương thức**: GET (Truy vấn bảng `crawler_tasks`)
* **Giới hạn**: Lấy tối đa 100 task mới nhất.
* **Sắp xếp**: Sắp xếp theo `created_at` giảm dần.
* **Dữ liệu trả về**: Mảng các đối tượng `CrawlerTask`.

### 4.2 Tạo nhiệm vụ cào đơn lẻ (`crawler_tasks` Insert)
* **Tên hàm frontend**: `createTask`
* **Phương thức**: POST (Insert vào bảng `crawler_tasks`)
* **Payload đầu vào**:
  ```typescript
  {
    platform: Platform,     // Nền tảng muốn cào
    command: string,        // Lệnh cào: 'search' | 'creator' | 'detail' | 'comments'
    target: string,         // Từ khóa tìm kiếm hoặc ID tác giả / ID bài đăng
    max_count?: number      // Số lượng bài tối đa muốn cào (mặc định: 20)
  }
  ```
* **Dữ liệu trả về**: Bản ghi `CrawlerTask` vừa được tạo thành công với trạng thái mặc định là `pending`.

### 4.3 Tạo hàng loạt nhiệm vụ cào (RPC Function)
* **Tên hàm frontend**: `createTasksBulk`
* **Phương thức**: POST (Gọi Database Function qua RPC)
* **RPC Endpoint**: `supabase.rpc('create_crawler_tasks', { p_tasks })`
* **Mục đích**: Tạo hàng loạt nhiệm vụ cào một cách an toàn và nguyên tử (atomic), tự động kiểm tra trùng lặp để bỏ qua các từ khóa/tác giả đang chạy hoặc đang chờ.
* **Payload đầu vào (`p_tasks` array, giới hạn tối đa 50 tasks/lần gọi)**:
  ```typescript
  Array<{
    platform: Platform;
    command: string;
    target: string;
    max_count?: number;
    priority?: 'critical' | 'high' | 'normal' | 'low';
    metadata?: {
      tags?: string[];
      language?: string;
      crawl_comments?: boolean;
      crawl_sub_comments?: boolean;
      headless?: boolean;
    }
  }>
  ```
* **Dữ liệu trả về**:
  ```typescript
  {
    inserted_count: number; // Số lượng nhiệm vụ đã được thêm thành công
    skipped_count: number;  // Số lượng nhiệm vụ bị bỏ qua do trùng lặp
    errors: string[];       // Danh sách chi tiết các cảnh báo lỗi hoặc trùng lặp
  }
  ```

### 4.4 Lấy log chạy chi tiết của nhiệm vụ (`crawler_logs`)
* **Tên hàm frontend**: `fetchTaskLogs`
* **Phương thức**: GET (Truy vấn bảng `crawler_logs`)
* **Tham số lọc (Filters)**:
  * `task_id` (required): Lọc log của nhiệm vụ cụ thể.
  * `limit` (default: 200): Lấy tối đa 200 dòng log gần nhất.
* **Sắp xếp**: Sắp xếp theo `created_at` tăng dần để đọc log theo thứ tự thời gian.
* **Dữ liệu trả về**:
  ```typescript
  Array<{
    id: string;             // ID dòng log
    task_id: string;        // ID nhiệm vụ liên kết
    level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
    message: string;        // Nội dung log (stdout/stderr từ worker)
    created_at: string;     // Thời điểm ghi nhận log
  }>
  ```

### 4.5 Lắng nghe trạng thái Task & Logs thời gian thực (Supabase Realtime)
Hệ thống sử dụng kết nối WebSocket để cập nhật giao diện ngay lập tức khi crawler đang hoạt động mà không cần tải lại trang.

#### A. Subscribe trạng thái Task
* **Tên hàm**: `subscribeToTasks`
* **Kênh (Channel)**: `tasks-realtime`
* **Sự kiện lắng nghe**: Lắng nghe các sự kiện `INSERT` và `UPDATE` trên bảng `crawler_tasks`.
* **Callback nhận được**: Trả về dữ liệu `CrawlerTask` mới nhất để frontend cập nhật lại dòng tương ứng trong Task Table.

#### B. Subscribe log chạy thời gian thực
* **Tên hàm**: `subscribeToTaskLogs`
* **Kênh (Channel)**: `task-logs-${taskId}`
* **Sự kiện lắng nghe**: Lắng nghe sự kiện `INSERT` trên bảng `crawler_logs` lọc theo điều kiện `task_id = taskId`.
* **Callback nhận được**: Trả về dòng log mới ghi nhận từ crawler để in trực tiếp lên màn hình Console Log của Task trong Dashboard.

---

## 👥 5. API Quản Lý Tài Khoản Thu Thập (Account Pool)
Quản lý các tài khoản mạng xã hội dùng để xoay vòng tránh bị chặn (rate-limit) khi cào dữ liệu.

### 5.1 Lấy danh sách tài khoản (`crawler_accounts`)
* **Tên hàm frontend**: `fetchAccounts`
* **Phương thức**: GET (Truy vấn bảng `crawler_accounts`)
* **Sắp xếp**: Sắp xếp theo `created_at` giảm dần.
* **Dữ liệu trả về**:
  ```typescript
  Array<{
    id: string;             // ID tài khoản
    platform: Platform;     // Nền tảng
    alias: string;          // Tên biệt danh hoặc username
    status: 'active' | 'expired' | 'blocked' | 'rate_limited';
    failure_count: number;  // Số lần lỗi liên tiếp khi dùng tài khoản này
    proxy: string | null;   // Proxy gán kèm tài khoản
    last_used_at: string | null;
    created_at: string;
  }>
  ```

---

## 📊 6. API Thống Kê & Phân Tích (Analytics)

### 6.1 Lấy các chỉ số tổng quan Dashboard (Metrics)
* **Tên hàm frontend**: `fetchDashboardMetrics`
* **Phương thức**: GET (Truy vấn tổng hợp số lượng bản ghi)
* **Quy trình hoạt động**: Gọi đồng thời 4 truy vấn tối giản đến database để đếm nhanh:
  1. Số lượng bài viết cào được: `supabase.from('crawled_posts').select('id', { count: 'exact', head: true })`
  2. Số lượng tác giả: `supabase.from('crawled_authors').select('id', { count: 'exact', head: true })`
  3. Lọc đếm nhiệm vụ `running` và `pending`: `supabase.from('crawler_tasks').select('id, status')`
  4. Lọc đếm tài khoản `active` và tổng số tài khoản: `supabase.from('crawler_accounts').select('id, status')`
* **Dữ liệu trả về**:
  ```typescript
  {
    totalPosts: number;
    totalAuthors: number;
    runningTasks: number;
    pendingTasks: number;
    activeAccounts: number;
    totalAccounts: number;
    postsTrend: number;
    authorsTrend: number;
  }
  ```

### 6.2 Lấy biểu đồ phân bổ bài viết theo nền tảng
* **Tên hàm frontend**: `fetchPlatformDistribution`
* **Phương thức**: GET (Truy vấn đếm nhóm `platform` trong bảng `crawled_posts`)
* **Dữ liệu trả về**: Mảng các nền tảng và số lượng tương ứng kèm mã màu hiển thị:
  ```typescript
  Array<{
    platform: Platform;
    count: number;
    color: string; // Hex color được map tương ứng với thương hiệu (vd Douyin: #FE2C55)
  }>
  ```

---

## 🧪 7. Các API Hiện Tại Đang Dùng Mock Data (Cần Bổ Sung CSDL/Backend)
Hiện tại, một số màn hình/tính năng nâng cao trên giao diện Dashboard đang gọi các hàm Mock Data cục bộ. Để hoàn thiện hệ thống, cần thiết kế thêm các bảng cơ sở dữ liệu và API thật tương ứng:

| Tên Hàm Mock | Tính Năng Trên Dashboard | Đặc Tả API Cần Thiết Lập Trong Tương Lai |
| :--- | :--- | :--- |
| `getProxies` | **Quản lý Proxy Pool** | Thiết lập bảng `crawler_proxies` để quản lý danh sách IP Proxy, Cổng, Trạng thái (Live/Die), và Vị trí địa lý. |
| `getAuditLogs` | **Nhật Ký Hệ Thống** | Thiết lập bảng `audit_logs` ghi nhận các hoạt động của quản trị viên (đăng nhập, tạo task, đổi trạng thái account). |
| `getExportedFiles`| **Lịch Sử Xuất Dữ Liệu**| Thiết lập bảng `exported_files` lưu trữ thông tin các file CSV/JSON đã được kết xuất và link tải về từ Cloud Storage (R2/S3). |
| `getPermissions` | **Phân Quyền Thành Viên** | Thiết lập bảng liên kết phân quyền vai trò (Roles & Permissions) cho quản trị viên và thành viên vận hành. |
| `getPlatformHealth`| **Sức Khỏe Nền Tảng** | Cần API tính toán tỷ lệ thành công/thất bại của các Task cào theo từng Platform trong 24h gần nhất. |
| `getPostsPerDay` | **Biểu Đồ Xu Hướng** | API thực hiện truy vấn gom nhóm (`GROUP BY date_trunc('day', crawled_at)`) để thống kê lượng dữ liệu thu thập theo ngày. |
| `getCreativeAdvertisers`<br>`getCreativeAds` | **Creative Hub (Quảng cáo)**| Thiết lập các bảng `creative_advertisers` và `creative_ads` để lưu trữ dữ liệu quảng cáo đối thủ cào được (ảnh, video, lượt hiển thị). |
