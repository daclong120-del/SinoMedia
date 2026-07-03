/**
 * Dữ liệu giả (mock) cho toàn bộ dashboard.
 * Sẽ được thay bằng Supabase client thật khi backend sẵn sàng.
 */
import type {
  CrawlerTask, CrawlerAccount, ProxyItem, CrawledAuthor, CrawledPost,
  AuditLogEntry, CrawlerLogEntry, ExportedFile, PostTag, PlatformHealth,
  ViewerPermission
} from "@/types";

// ─── Helper ──────────────────────────────────────────────────
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

// ─── Platform Health ─────────────────────────────────────────
export const platformHealth: PlatformHealth[] = [
  { platform: "douyin", active: 12, banned: 3, total: 15 },
  { platform: "xhs", active: 8, banned: 1, total: 9 },
  { platform: "bilibili", active: 10, banned: 2, total: 12 },
  { platform: "weibo", active: 5, banned: 4, total: 9 },
  { platform: "kuaishou", active: 3, banned: 0, total: 3 },
  { platform: "tieba", active: 2, banned: 1, total: 3 },
  { platform: "zhihu", active: 4, banned: 0, total: 4 },
  { platform: "tiktok", active: 6, banned: 2, total: 8 },
];

// ─── Metric Cards ────────────────────────────────────────────
export const homeMetrics = {
  totalPosts: 24_839,
  totalAuthors: 1_247,
  runningTasks: 3,
  pendingTasks: 5,
  activeAccounts: 50,
  totalAccounts: 63,
  postsTrend: +12.5,
  authorsTrend: +8.3,
};

// ─── Posts per day (7 ngày) ──────────────────────────────────
export const postsPerDay = [
  { date: "28/06", count: 312 },
  { date: "29/06", count: 456 },
  { date: "30/06", count: 389 },
  { date: "01/07", count: 521 },
  { date: "02/07", count: 478 },
  { date: "03/07", count: 634 },
  { date: "04/07", count: 412 },
];

// ─── Platform distribution ───────────────────────────────────
export const platformDistribution = [
  { platform: "douyin" as const, count: 8_934, color: "#FE2C55" },
  { platform: "bilibili" as const, count: 5_621, color: "#00A1D6" },
  { platform: "xhs" as const, count: 4_218, color: "#FF2442" },
  { platform: "weibo" as const, count: 2_843, color: "#E6162D" },
  { platform: "kuaishou" as const, count: 1_567, color: "#FF4906" },
  { platform: "zhihu" as const, count: 987, color: "#0066FF" },
  { platform: "tieba" as const, count: 432, color: "#1678FF" },
  { platform: "tiktok" as const, count: 237, color: "#000000" },
];

// ─── Tasks ───────────────────────────────────────────────────
export const mockTasks: CrawlerTask[] = [
  { id: "T-001", platform: "douyin", command: "creator", target: "UID_12345678", status: "running", priority: "high", scheduled_at: null, created_at: ago(2), created_by: "admin@sinomedia.vn" },
  { id: "T-002", platform: "xhs", command: "search", target: "kem chống nắng review", status: "running", priority: "normal", scheduled_at: null, created_at: ago(3), created_by: "admin@sinomedia.vn" },
  { id: "T-003", platform: "bilibili", command: "creator", target: "UP主_987654", status: "pending", priority: "critical", scheduled_at: null, created_at: ago(1), created_by: "admin@sinomedia.vn" },
  { id: "T-004", platform: "douyin", command: "comment", target: "video_abc123", status: "completed", priority: "normal", scheduled_at: null, created_at: ago(12), created_by: "viewer@sinomedia.vn" },
  { id: "T-005", platform: "weibo", command: "search", target: "热搜美妆", status: "failed", priority: "high", scheduled_at: null, created_at: ago(6), created_by: "admin@sinomedia.vn" },
  { id: "T-006", platform: "tiktok", command: "creator", target: "@beautyguru", status: "scheduled", priority: "low", scheduled_at: ago(-24), created_at: ago(1), created_by: "viewer@sinomedia.vn" },
  { id: "T-007", platform: "kuaishou", command: "search", target: "直播带货", status: "running", priority: "normal", scheduled_at: null, created_at: ago(0.5), created_by: "admin@sinomedia.vn" },
  { id: "T-008", platform: "zhihu", command: "creator", target: "知乎大V_李明", status: "completed", priority: "normal", scheduled_at: null, created_at: ago(24), created_by: "admin@sinomedia.vn" },
  { id: "T-009", platform: "tieba", command: "search", target: "化妆品推荐", status: "cancelled", priority: "low", scheduled_at: null, created_at: ago(48), created_by: "admin@sinomedia.vn" },
  { id: "T-010", platform: "xhs", command: "ads", target: "竞品分析_完美日记", status: "pending", priority: "high", scheduled_at: null, created_at: ago(0.2), created_by: "admin@sinomedia.vn" },
];

// ─── Accounts ────────────────────────────────────────────────
export const mockAccounts: CrawlerAccount[] = [
  { id: "A-001", platform: "douyin", alias: "douyin_main_01", status: "active", failure_count: 0, proxy: "103.45.67.89:8080", last_used_at: ago(0.5), created_at: ago(720) },
  { id: "A-002", platform: "douyin", alias: "douyin_backup_02", status: "active", failure_count: 1, proxy: null, last_used_at: ago(2), created_at: ago(360) },
  { id: "A-003", platform: "douyin", alias: "douyin_old_03", status: "banned", failure_count: 3, proxy: null, last_used_at: ago(72), created_at: ago(1440) },
  { id: "A-004", platform: "xhs", alias: "xhs_account_01", status: "active", failure_count: 0, proxy: "203.12.34.56:3128", last_used_at: ago(1), created_at: ago(480) },
  { id: "A-005", platform: "bilibili", alias: "bili_crawler_01", status: "active", failure_count: 0, proxy: null, last_used_at: ago(3), created_at: ago(600) },
  { id: "A-006", platform: "bilibili", alias: "bili_crawler_02", status: "banned", failure_count: 5, proxy: null, last_used_at: ago(96), created_at: ago(500) },
  { id: "A-007", platform: "weibo", alias: "weibo_main", status: "active", failure_count: 2, proxy: "45.67.89.12:1080", last_used_at: ago(4), created_at: ago(300) },
  { id: "A-008", platform: "tiktok", alias: "tiktok_us_01", status: "active", failure_count: 0, proxy: "198.51.100.1:8888", last_used_at: ago(6), created_at: ago(200) },
];

// ─── Proxies ─────────────────────────────────────────────────
export const mockProxies: ProxyItem[] = [
  { id: "P-001", host: "103.45.67.89", port: 8080, username: "user1", password: null, protocol: "http", status: "active", assigned_account_id: "A-001", assigned_account_alias: "douyin_main_01", last_used_at: ago(0.5), created_at: ago(720) },
  { id: "P-002", host: "203.12.34.56", port: 3128, username: "crawler", password: null, protocol: "http", status: "active", assigned_account_id: "A-004", assigned_account_alias: "xhs_account_01", last_used_at: ago(1), created_at: ago(480) },
  { id: "P-003", host: "45.67.89.12", port: 1080, username: null, password: null, protocol: "socks5", status: "active", assigned_account_id: "A-007", assigned_account_alias: "weibo_main", last_used_at: ago(4), created_at: ago(300) },
  { id: "P-004", host: "198.51.100.1", port: 8888, username: "tikuser", password: null, protocol: "http", status: "active", assigned_account_id: "A-008", assigned_account_alias: "tiktok_us_01", last_used_at: ago(6), created_at: ago(200) },
  { id: "P-005", host: "192.168.1.100", port: 3128, username: null, password: null, protocol: "http", status: "inactive", assigned_account_id: null, assigned_account_alias: null, last_used_at: null, created_at: ago(100) },
  { id: "P-006", host: "10.0.0.55", port: 1080, username: "rotator", password: null, protocol: "socks5", status: "active", assigned_account_id: null, assigned_account_alias: null, last_used_at: ago(0.2), created_at: ago(50) },
  { id: "P-007", host: "dead.proxy.example", port: 8080, username: null, password: null, protocol: "http", status: "dead", assigned_account_id: null, assigned_account_alias: null, last_used_at: ago(240), created_at: ago(1000) },
];

// ─── Authors ─────────────────────────────────────────────────
export const mockAuthors: CrawledAuthor[] = [
  { id: "AU-001", platform_uid: "dy_12345678", nickname: "Tiểu Mỹ 小美", platform: "douyin", gender: "female", description: "Beauty blogger | 500K fans | Hà Nội", fans_count: 523_000, follows_count: 120, ip_location: "Hà Nội", avatar_url: "", crawled_at: ago(2) },
  { id: "AU-002", platform_uid: "xhs_87654321", nickname: "护肤达人Lisa", platform: "xhs", gender: "female", description: "护肤 | 穿搭 | 好物分享", fans_count: 1_200_000, follows_count: 350, ip_location: "上海", avatar_url: "", crawled_at: ago(5) },
  { id: "AU-003", platform_uid: "bili_UP_999", nickname: "科技宅男小王", platform: "bilibili", gender: "male", description: "数码测评 | 编程教学", fans_count: 890_000, follows_count: 45, ip_location: "深圳", avatar_url: "", crawled_at: ago(12) },
  { id: "AU-004", platform_uid: "wb_official_abc", nickname: "微博时尚", platform: "weibo", gender: "unknown", description: "微博官方时尚频道", fans_count: 5_400_000, follows_count: 200, ip_location: "北京", avatar_url: "", crawled_at: ago(24) },
  { id: "AU-005", platform_uid: "ks_live_seller", nickname: "快手带货王", platform: "kuaishou", gender: "male", description: "直播带货 | 日用百货", fans_count: 340_000, follows_count: 80, ip_location: "义乌", avatar_url: "", crawled_at: ago(36) },
  { id: "AU-006", platform_uid: "tt_beautyguru", nickname: "BeautyGuruUS", platform: "tiktok", gender: "female", description: "Beauty tips & tutorials 🎀", fans_count: 2_100_000, follows_count: 500, ip_location: "US", avatar_url: "", crawled_at: ago(8) },
];

// ─── Posts ────────────────────────────────────────────────────
export const mockPosts: CrawledPost[] = [
  { id: "PO-001", platform: "douyin", author_id: "AU-001", platform_uid: "dy_12345678", title: "", caption: "Chia sẻ 5 bước skincare buổi sáng cho da dầu mụn 🌞 #skincare #beauty", cover_url: "", like_count: 45_200, view_count: 890_000, comment_count: 1_230, media_urls: [], tags: ["skincare", "beauty"], published_at: ago(48), crawled_at: ago(2) },
  { id: "PO-002", platform: "xhs", author_id: "AU-002", platform_uid: "xhs_87654321", title: "夏日防晒霜测评", caption: "测评了10款热门防晒霜，最推荐这3款！价格从50到300不等...", cover_url: "", like_count: 23_800, view_count: 456_000, comment_count: 890, media_urls: [], tags: ["防晒", "测评"], published_at: ago(72), crawled_at: ago(5) },
  { id: "PO-003", platform: "bilibili", author_id: "AU-003", platform_uid: "bili_UP_999", title: "M4 MacBook Pro 深度测评", caption: "这次苹果真的给力了！M4芯片性能提升40%...", cover_url: "", like_count: 67_000, view_count: 1_230_000, comment_count: 3_400, media_urls: [], tags: ["科技", "MacBook"], published_at: ago(96), crawled_at: ago(12) },
  { id: "PO-004", platform: "douyin", author_id: "AU-001", platform_uid: "dy_12345678", title: "", caption: "这个粉底液真的绝了！遮瑕力max 持妆12小时 #makeup #foundation", cover_url: "", like_count: 31_500, view_count: 650_000, comment_count: 780, media_urls: [], tags: ["makeup"], published_at: ago(120), crawled_at: ago(2) },
  { id: "PO-005", platform: "tiktok", author_id: "AU-006", platform_uid: "tt_beautyguru", title: "Glass skin tutorial", caption: "How to achieve the perfect glass skin look in 5 minutes ✨ #glassskin #kbeauty", cover_url: "", like_count: 156_000, view_count: 3_400_000, comment_count: 5_600, media_urls: [], tags: ["glassskin", "kbeauty"], published_at: ago(24), crawled_at: ago(8) },
  { id: "PO-006", platform: "weibo", author_id: "AU-004", platform_uid: "wb_official_abc", title: "2026春夏流行趋势", caption: "#时尚# 2026年春夏必备单品合集，从配色到剪裁全解析...", cover_url: "", like_count: 12_300, view_count: 345_000, comment_count: 450, media_urls: [], tags: ["时尚", "趋势"], published_at: ago(168), crawled_at: ago(24) },
];

// ─── Audit Logs ──────────────────────────────────────────────
export const mockAuditLogs: AuditLogEntry[] = [
  { id: "AL-001", actor_id: "admin@sinomedia.vn", action: "task.create", entity_type: "crawler_tasks", entity_id: "T-001", payload: { platform: "douyin", command: "creator" }, ip_address: "192.168.1.10", created_at: ago(2) },
  { id: "AL-002", actor_id: "admin@sinomedia.vn", action: "account.add", entity_type: "crawler_accounts", entity_id: "A-001", payload: { platform: "douyin", alias: "douyin_main_01" }, ip_address: "192.168.1.10", created_at: ago(5) },
  { id: "AL-003", actor_id: "admin@sinomedia.vn", action: "account.unban", entity_type: "crawler_accounts", entity_id: "A-003", payload: { previous_status: "banned" }, ip_address: "192.168.1.10", created_at: ago(12) },
  { id: "AL-004", actor_id: "admin@sinomedia.vn", action: "settings.update", entity_type: "system_settings", entity_id: "captcha_strategy", payload: { old: "skip_ban", new: "auto_solve" }, ip_address: "192.168.1.10", created_at: ago(24) },
  { id: "AL-005", actor_id: "viewer@sinomedia.vn", action: "data.export", entity_type: "crawled_posts", entity_id: "export_001", payload: { format: "xlsx", filter: { platform: "douyin" } }, ip_address: "192.168.1.20", created_at: ago(48) },
  { id: "AL-006", actor_id: "admin@sinomedia.vn", action: "task.cancel", entity_type: "crawler_tasks", entity_id: "T-009", payload: {}, ip_address: "192.168.1.10", created_at: ago(72) },
  { id: "AL-007", actor_id: "admin@sinomedia.vn", action: "permission.update", entity_type: "viewer_permissions", entity_id: "export_data", payload: { allowed: true }, ip_address: "192.168.1.10", created_at: ago(96) },
];

// ─── Console Logs (mẫu cho 1 task) ──────────────────────────
export const mockConsoleLogs: CrawlerLogEntry[] = [
  { id: "CL-001", task_id: "T-001", level: "INFO", message: "[Douyin] Khởi tạo crawler cho UID_12345678...", created_at: ago(1.5) },
  { id: "CL-002", task_id: "T-001", level: "INFO", message: "[Douyin] Checkout tài khoản: douyin_main_01 (Active, last_used: 2h ago)", created_at: ago(1.4) },
  { id: "CL-003", task_id: "T-001", level: "DEBUG", message: "[HTTP] GET https://www.douyin.com/user/UID_12345678 → 200 OK (342ms)", created_at: ago(1.3) },
  { id: "CL-004", task_id: "T-001", level: "INFO", message: "[Douyin] Tìm thấy 47 video từ creator UID_12345678", created_at: ago(1.2) },
  { id: "CL-005", task_id: "T-001", level: "DEBUG", message: "[HTTP] GET /aweme/v1/web/aweme/post → 200 OK (567ms)", created_at: ago(1.1) },
  { id: "CL-006", task_id: "T-001", level: "WARN", message: "[Douyin] Rate limit detected, đợi 5 giây...", created_at: ago(1.0) },
  { id: "CL-007", task_id: "T-001", level: "INFO", message: "[Douyin] Đã cào 12/47 video, tiếp tục...", created_at: ago(0.9) },
  { id: "CL-008", task_id: "T-001", level: "DEBUG", message: "[R2] Upload video_abc123.mp4 → Cloudflare R2 (12.3MB, 2.1s)", created_at: ago(0.8) },
  { id: "CL-009", task_id: "T-001", level: "INFO", message: "[Supabase] Ghi 12 bài viết vào crawled_posts", created_at: ago(0.7) },
  { id: "CL-010", task_id: "T-001", level: "ERROR", message: "[Douyin] CAPTCHA detected! Gửi tới 2Captcha API để giải...", created_at: ago(0.6) },
  { id: "CL-011", task_id: "T-001", level: "INFO", message: "[2Captcha] CAPTCHA solved thành công (3.2s), tiếp tục cào...", created_at: ago(0.5) },
];

// ─── Exported Files ──────────────────────────────────────────
export const mockExportedFiles: ExportedFile[] = [
  { id: "EX-001", filename: "douyin_posts_20260701.xlsx", type: "xlsx", filter_snapshot: { platform: "douyin", date_from: "2026-06-01" }, size_bytes: 2_450_000, created_by: "admin@sinomedia.vn", created_at: ago(24), download_url: "#" },
  { id: "EX-002", filename: "all_authors_export.csv", type: "csv", filter_snapshot: {}, size_bytes: 890_000, created_by: "viewer@sinomedia.vn", created_at: ago(48), download_url: "#" },
  { id: "EX-003", filename: "xhs_beauty_posts.xlsx", type: "xlsx", filter_snapshot: { platform: "xhs", tags: ["beauty"] }, size_bytes: 1_230_000, created_by: "admin@sinomedia.vn", created_at: ago(72), download_url: "#" },
];

// ─── Tags ────────────────────────────────────────────────────
export const mockTags: PostTag[] = [
  { id: "TG-001", name: "skincare", color: "#3b82f6", description: "Chăm sóc da, mỹ phẩm", usage_count: 234, created_at: ago(720) },
  { id: "TG-002", name: "beauty", color: "#ec4899", description: "Làm đẹp tổng hợp", usage_count: 567, created_at: ago(720) },
  { id: "TG-003", name: "科技", color: "#8b5cf6", description: "Công nghệ", usage_count: 189, created_at: ago(360) },
  { id: "TG-004", name: "时尚", color: "#f59e0b", description: "Thời trang", usage_count: 345, created_at: ago(240) },
  { id: "TG-005", name: "kbeauty", color: "#10b981", description: "K-Beauty Hàn Quốc", usage_count: 78, created_at: ago(120) },
];

// ─── Viewer Permissions ──────────────────────────────────────
export const mockPermissions: ViewerPermission[] = [
  { key: "view_overview", label: "Xem trang Tổng quan", allowed: true },
  { key: "view_tasks", label: "Xem danh sách Tasks", allowed: true },
  { key: "create_task_immediate", label: "Tạo Task – Chạy ngay", allowed: false, lockedOff: true, note: "Luôn tắt với Viewer" },
  { key: "create_task_scheduled", label: "Tạo Task – Lên lịch tương lai", allowed: true },
  { key: "view_console_logs", label: "Xem Console Logs", allowed: true },
  { key: "view_accounts", label: "Xem trang Accounts", allowed: false },
  { key: "view_proxies", label: "Xem trang Proxy Pool", allowed: false },
  { key: "view_authors", label: "Xem trang Tác giả", allowed: true },
  { key: "view_posts", label: "Xem trang Bài viết & Video", allowed: true },
  { key: "export_data", label: "Xuất Excel / CSV", allowed: true },
  { key: "tag_posts", label: "Gắn nhãn bài viết", allowed: false },
  { key: "delete_posts", label: "Xóa bài viết", allowed: false, lockedOff: true },
  { key: "view_data_management", label: "Xem trang Quản lý dữ liệu", allowed: false },
  { key: "view_audit_logs", label: "Xem Audit Logs", allowed: false, locked: true },
  { key: "view_settings", label: "Xem Cài đặt hệ thống", allowed: false, locked: true },
  { key: "view_permissions", label: "Xem Phân quyền", allowed: false, locked: true },
];
