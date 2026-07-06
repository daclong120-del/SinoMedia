/**
 * Service — Dashboard Metrics
 * Tổng hợp dữ liệu cho trang Home dashboard: metrics, biểu đồ, platform health.
 */
import { createClientServer } from "@/lib/supabase/server";
import { PostRepository } from "@/lib/repositories/post.repo";
import { AuthorRepository } from "@/lib/repositories/author.repo";
import { TaskRepository } from "@/lib/repositories/task.repo";
import { AccountRepository } from "@/lib/repositories/account.repo";
import type { Platform } from "@/types";

// ─── Bảng màu platform (concern trình bày, không phải repo) ──
const PLATFORM_COLORS: Record<string, string> = {
  douyin: "#FE2C55",
  bilibili: "#00A1D6",
  xhs: "#FF2442",
  weibo: "#E6162D",
  kuaishou: "#FF4906",
  zhihu: "#0066FF",
  tieba: "#1678FF",
  tiktok: "#000000",
};

const TRACKED_PLATFORMS: Platform[] = [
  "douyin", "xhs", "bilibili", "weibo", "kuaishou", "tiktok",
];

// ─── Types ───────────────────────────────────────────────────

export interface DashboardMetrics {
  totalPosts: number;
  totalAuthors: number;
  runningTasks: number;
  pendingTasks: number;
  activeAccounts: number;
  totalAccounts: number;
  postsTrend: number;
  authorsTrend: number;
}

export interface PlatformDistItem {
  platform: Platform;
  count: number;
  color: string;
}

export interface PlatformHealthItem {
  platform: Platform;
  active: number;
  banned: number;
  total: number;
}

// ─── Service Functions ───────────────────────────────────────

/** Lấy tổng quan metrics cho trang Home */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = await createClientServer();
  const postRepo = new PostRepository(db);
  const authorRepo = new AuthorRepository(db);
  const taskRepo = new TaskRepository(db);
  const accountRepo = new AccountRepository(db);

  const [totalPosts, totalAuthors, tasks, accounts] = await Promise.all([
    postRepo.count(),
    authorRepo.count(),
    taskRepo.findAllWithStatus(),
    accountRepo.findAll(),
  ]);

  return {
    totalPosts,
    totalAuthors,
    runningTasks: tasks.filter((t) => t.status === "running").length,
    pendingTasks: tasks.filter((t) => t.status === "pending").length,
    activeAccounts: accounts.filter((a) => a.status === "active").length,
    totalAccounts: accounts.length,
    postsTrend: 0,  // TODO: so sánh với tuần trước
    authorsTrend: 0,
  };
}

/** Lấy phân bố bài viết theo platform (cho biểu đồ tròn) */
export async function getPlatformDistribution(): Promise<PlatformDistItem[]> {
  const db = await createClientServer();
  const postRepo = new PostRepository(db);
  const counts = await postRepo.countByPlatform();

  return Object.entries(counts)
    .map(([platform, count]) => ({
      platform: platform as Platform,
      count,
      color: PLATFORM_COLORS[platform] ?? "#666",
    }))
    .sort((a, b) => b.count - a.count);
}

/** Lấy số bài viết theo ngày (cho biểu đồ xu hướng 7 ngày) */
export async function getPostsPerDay(): Promise<{ date: string; count: number }[]> {
  const db = await createClientServer();
  const postRepo = new PostRepository(db);
  return postRepo.countByDay(7);
}

/** Lấy sức khỏe platform (số tài khoản active/banned) */
export async function getPlatformHealth(): Promise<PlatformHealthItem[]> {
  const db = await createClientServer();
  const accountRepo = new AccountRepository(db);
  const accounts = await accountRepo.findAllWithStatus();

  const agg: Record<string, { active: number; banned: number; total: number }> = {};
  accounts.forEach((row) => {
    const p = row.platform;
    if (!agg[p]) agg[p] = { active: 0, banned: 0, total: 0 };
    agg[p].total += 1;
    if (row.status === "active") agg[p].active += 1;
    if (row.status === "banned" || row.status === "expired") agg[p].banned += 1;
  });

  return TRACKED_PLATFORMS.map((p) => ({
    platform: p,
    active: agg[p]?.active ?? 0,
    banned: agg[p]?.banned ?? 0,
    total: agg[p]?.total ?? 0,
  }));
}
