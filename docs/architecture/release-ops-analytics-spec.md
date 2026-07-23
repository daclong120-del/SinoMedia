# Đặc tả Kiến trúc & Dữ liệu: Release Ops Analytics & Statistics Dashboard

Tài liệu này định nghĩa cấu trúc dữ liệu, giao diện và luồng nghiệp vụ cho phân hệ **Release Ops Analytics & Dashboard Thống kê** cho hệ thống SinoMedia / LutechTools.

---

## 1. Tổng quan Cấu trúc Menu & Phân hệ (Navigation Structure)

Phân hệ Release Ops bao gồm các tab chức năng chính:

1. **Tổng quan Ops (`Overview`)**: Dashboard giám sát luồng phát hành hôm nay, biểu đồ sức khỏe builds 14 ngày qua, hàng chờ duyệt Google Play và các ứng dụng cần xử lý gấp.
2. **CR Trend ASO (`ASO Analytics`)**: Biểu đồ xu hướng Conversion Rate (CR) theo thời gian gắn kèm vạch sự kiện (Listing event markers), bảng xếp hạng CR theo app vs Peers benchmark và bộ quét thị trường GEO tiềm năng.
3. **Danh sách Release (`Releases`)**: Bảng quản lý chi tiết từng bản phát hành, bộ lọc đa chiều (Status, Track, Account, Health signal), Cổng kiểm duyệt Dynamic Readiness Gate và Popup xác nhận thao tác an toàn (Audit context modal).
4. **Batch Ops (`Batch Operations`)**: Điều phối phát hành hàng loạt, chạy thử canary (Canary staged rollout), xem trước bảng danh sách app ảnh hưởng (Preview affected apps) và kế hoạch rollback tự động.
5. **Upload AAB (`Upload`)**: Tải tệp bản phát hành kèm chọn Target App, Target Track (`Production`, `Beta`, `Alpha`, `Internal`), kiểm tra checksum/keystore và biên tập Release Notes đa ngôn ngữ.
6. **Danh mục App (`Apps Registry`)**: Quản lý metadata 102+ ứng dụng (Team owner, Data safety form status, Privacy policy URL, Store listing locales).
7. **Target SDK (`Compliance Mandate`)**: Giám sát hạn chót nâng cấp Target SDK 34 (Android 14) với đồng hồ đếm ngược ngày còn lại và tạo Batch Upgrade.
8. **Tài khoản Play (`Play Accounts`)**: Quản lý Service Account Keys, OAuth Scopes, kiểm tra latency kết nối (Test connection) và xoay vòng key (Rotate key).

---

## 2. Thông tin Dữ liệu & Giao diện Cần thiết (Detailed Specifications)

### 2.1. Tab "Tổng quan Ops" (`Overview`)

#### **Header Strip & Stats Bar**
- **Thông tin Tổ chức**: `Lutech Release Ops` &bull; `102 apps` &bull; `4 dev accounts`.
- **Trạng thái Đồng bộ**: `@ play sync - lần cuối 14:52` (Thời gian đồng bộ thực tế từ Google Play Developer API).
- **Thanh Tiến trình Hôm nay (Pipeline Today Stage Counter)**:
  - `DRAFT` (4 apps): Bản nháp / local build. Kèm 3 nhãn phụ: `build_failed: 3`, `rejected: 2`, `halted: 1`.
  - `BUILDING` (7 apps): Đang biên dịch trong pipeline CI.
  - `IN_REVIEW` (12 apps): Bản phát hành đang chờ Google Play Console phê duyệt.
  - `ROLLING_OUT` (9 apps): Đang phân phối dạng Staged Rollout (5% – 50%).
  - `LIVE` (86 apps): Đã phát hành chính thức 100% trên Store.

#### **Biểu đồ Sức khỏe Pipeline CI/CD (Builds 14 ngày qua)**
- **Loại Biểu đồ**: Stacked Bar Chart (Cột chồng Thống kê).
- **Nguồn dữ liệu**: `ci_webhook` (GitHub Actions / GitLab CI Webhook event logs).
- **Trục hoành (X-axis)**: Lịch sử 14 ngày gần nhất (từ 21/06 đến 04/07).
- **Trục tung (Y-axis)**: Số lượng lượt build per ngày (0 – 25 builds).
- **Phân loại Cột**:
  - Cột màu xanh ngọc (`#10b981`): Số lượng build **Success**.
  - Cột màu đỏ gạch (`#f43f5e`): Số lượng build **Failed**.
- **Chỉ số Kèm theo**: Tỷ lệ thành công tổng thể (ví dụ: `Pass Rate: 92.8% - 26/28 builds`).

#### **Các Khối Thao tác Đáy (Operational Queue Cards)**
1. **Hàng chờ Duyệt (Review Queue)**:
   - Danh sách bản phát hành đang chờ Google duyệt, sắp xếp ưu tiên theo số giờ đã chờ (`reviewAgeHours`) so với hạn cam kết SLA (`slaHours` < 48h).
2. **Cần xử lý (Action Required)**:
   - Gom toàn bộ ứng dụng bị `Rejected` hoặc `Build Failed` trong vòng 48 giờ qua kèm nút **Xử lý ngay**.
3. **Rollout đang chạy (Active Staged Rollouts)**:
   - Danh sách ứng dụng đang chạy Staged Rollout < 100% kèm thanh % tiến trình, chỉ số Crash/ANR thực tế và khuyến nghị tăng % từ Rollout Health Guard.

---

### 2.2. Tab "CR Trend ASO" (`ASO Analytics`)

#### **Biểu đồ Xu hướng Tỷ lệ Chuyển đổi (CR Trend Line Chart with Event Markers)**
- **Tiêu đề Chart**: `CR trend - Home AI · US · organic search`.
- **Nguồn dữ liệu**: `GCS store_performance export`.
- **Trục tung (Y-axis)**: Conversion Rate % (từ 20% đến 38%).
- **Trục hoành (X-axis)**: Lịch sử 30 ngày.
- **Đặc trưng Độc quyền - Vạch Sự kiện (Listing Event Marker Line)**:
  - Vạch nét đứt màu cam thẳng đứng đánh dấu ngày cập nhật listing lấy từ Release Timeline Trace (Ví dụ: `Đổi bộ screenshots` ngày 22/06).
  - Giúp operator đối soát ngay sự thay đổi của tỷ lệ chuyển đổi trước và sau khi thay đổi icon/screenshot/mô tả.

#### **Bảng CR Theo App (28 ngày vs Peers Benchmark)**
- **Mục tiêu**: Đánh giá hiệu quả chuyển đổi của từng app so với trung vị đối thủ cạnh tranh cùng thể loại trên Google Play.
- **Các Cột Dữ liệu**:
  1. `APP`: Tên ứng dụng.
  2. `VISITORS`: Tổng lượt truy cập trang cửa hàng 28 ngày qua (dạng K/M, ví dụ: 184K, 1.2M).
  3. `CR`: Tỷ lệ chuyển đổi cài đặt (Conversion Rate %).
  4. `VS PEERS`: Chênh lệch so với benchmark đối thủ (màu xanh nếu dương `+6.2%`, màu đỏ nếu âm `-9.1%`).

#### **Bảng GEO Scan (Visitors Cao, CR Thấp)**
- **Mục tiêu**: Tự động phát hiện các quốc gia có lưu lượng truy cập cao nhưng tỷ lệ chuyển đổi thấp để làm ứng viên cho Custom Store Listing hoặc bản dịch ngôn ngữ địa phương.
- **Các Cột Dữ liệu**:
  1. `APP · GEO`: Tên app & mã quốc gia (ví dụ: `Home AI - BR`, `Vibely - IN`, `Wallpaper 4K - MX`).
  2. `VISITORS`: Lượt ghé thăm tại quốc gia đó.
  3. `CR`: Conversion Rate tại quốc gia đó.
  4. `CẢNH BÁO / GỢI Ý`: Lý do và hành động đề xuất (ví dụ: `Chưa có bản pt-BR`, `Screenshot chỉ EN`, `Bản dịch máy tra`, `CR dưới median`).

---

### 2.3. Tab "Batch Operations" (`Batch Ops`)

#### **Thẻ Quản lý Batch Job (Batch Operation Cards)**
- **Tiêu đề Job**: Tên công việc hàng loạt (Ví dụ: `Bump AdMob 23.6.0 - batch IAA #1`, `Promote production 10% - tuần 27`, `targetSdk 36 - đợt 1`).
- **Phân loại & Cấu hình**: Thẻ tag thể hiện `type`, `totalApps`, `concurrency`, `mode` (`canary` / `mass_promote`).
- **Thanh Tiến trình Đa Phân đoạn (Multi-Segment Progress Bar)**:
  - Màu xanh lá (`Success`), Màu xanh dương (`Running`), Màu đỏ (`Failed`), Màu xám (`Pending`).
- **Thông báo Trạng thái Canary (Canary Status Banner)**:
  - Ví dụ: `Canary passed 3/3 - QR Scanner Plus, Sticker Studio, Photo Frame AI build + upload internal OK. Đã mở van 27 apps còn lại.`
- **Nút Thao tác**: `Retry failed`, `Cancel pending`, `Tăng rollout -> 25%`, `Start (canary)`.

---

## 3. Quy chuẩn Mã nguồn & Mô hình Dữ liệu (TypeScript Types)

Các mô hình dữ liệu này đã được đồng bộ trong `dashboard/types/release-ops.ts` và `dashboard/lib/fixtures/release-ops-fixtures.ts`:

```typescript
export interface ASOConversionMetric {
  id: string;
  appName: string;
  packageName: string;
  visitorsCount: number;
  conversionRatePct: number;
  vsPeersPct: number; // e.g. +6.2 or -3.0
  topGeo: string;
  listingEventMarker?: {
    date: string;
    eventTitle: string; // e.g. "Đổi bộ screenshots"
  };
}

export interface GeoScanWarning {
  appGeo: string; // e.g. "Home AI - BR"
  visitorsCount: number;
  conversionRatePct: number;
  warningReason: string; // e.g. "Chưa có bản pt-BR"
}

export interface CIBuildDayStat {
  date: string;
  successCount: number;
  failedCount: number;
}
```

---

## 4. Kế hoạch Triển khai UI Components

1. **`OverviewPage` (`/dash/release-ops/overview`)**:
   - Tích hợp Widget **Pipeline Today Stage Counter** và **Builds 14 ngày qua** (Stacked Bar Chart).
   - Tích hợp 3 khối card bottom: Review Queue, Action Required, Active Staged Rollouts.

2. **`ASOAnalyticsPage` (`/dash/release-ops/aso`)**:
   - Render biểu đồ đường **CR Trend Line Chart** kèm vạch cam nét đứt đánh dấu sự kiện đổi listing.
   - Render bảng **CR theo App (vs Peers Benchmark)** và bảng **GEO Scan (Visitors cao, CR thấp)**.

3. **`BatchOpsPage` (`/dash/release-ops/batch`)**:
   - Render danh sách Batch Jobs với thanh tiến trình đa phân đoạn, thông báo Canary và quy trình 2 bước Preview affected apps.
