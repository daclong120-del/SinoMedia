/**
 * Data Access Layer — Lấy data từ Supabase, fallback về mock khi lỗi.
 * Dùng Supabase JS SDK (PostgREST HTTP dưới hood).
 */
import { supabase } from "./supabase";
import type {
  CrawledAuthor, CrawledPost, CrawlerTask, CrawlerAccount,
  CrawledComment, Platform
} from "@/types";
import {
  mockAuthors, mockPosts, mockTasks, mockAccounts,
  homeMetrics, postsPerDay, platformDistribution, platformHealth,
  mockCreativeAdvertisers, mockCreativeAds,
  mockProxies, mockAuditLogs, mockConsoleLogs, mockExportedFiles,
  mockTags, mockPermissions
} from "./mock-data";

// ─── Types nội bộ ────────────────────────────────────────────

interface DashboardMetrics {
  totalPosts: number;
  totalAuthors: number;
  runningTasks: number;
  pendingTasks: number;
  activeAccounts: number;
  totalAccounts: number;
  postsTrend: number;
  authorsTrend: number;
}

interface PostFilter {
  platform?: Platform;
  search?: string;
  limit?: number;
  offset?: number;
}

interface AuthorFilter {
  platform?: Platform;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Helper: map DB row → Dashboard type ─────────────────────

function mapDbPost(row: Record<string, unknown>): CrawledPost {
  const stats = (row.stats as Record<string, number>) || {};
  const raw = (row.raw as Record<string, unknown>) || {};
  return {
    id: row.id as string,
    platform: row.platform as Platform,
    author_id: (row.author_id as string) || "",
    platform_uid: (row.platform_id as string) || "",
    title: (raw.title as string) || (row.caption as string)?.slice(0, 50) || "",
    caption: (row.caption as string) || "",
    cover_url: (row.cover_url as string) || "",
    like_count: stats.digg_count || stats.like_count || 0,
    view_count: stats.play_count || stats.view_count || 0,
    comment_count: stats.comment_count || 0,
    media_urls: (row.media_urls as string[]) || [],
    tags: [],
    published_at: (row.published_at as string) || "",
    crawled_at: (row.crawled_at as string) || "",
  };
}

function mapDbAuthor(row: Record<string, unknown>): CrawledAuthor {
  return {
    id: row.id as string,
    platform_uid: (row.platform_uid as string) || "",
    nickname: (row.nickname as string) || "Unknown",
    platform: row.platform as Platform,
    gender: (row.gender as "male" | "female" | "unknown") || "unknown",
    description: (row.description as string) || "",
    fans_count: (row.fans_count as number) || 0,
    follows_count: (row.follows_count as number) || 0,
    ip_location: (row.ip_location as string) || "",
    avatar_url: (row.avatar_url as string) || "",
    crawled_at: (row.updated_at as string) || (row.created_at as string) || "",
  };
}

function mapDbTask(row: Record<string, unknown>): CrawlerTask {
  return {
    id: row.id as string,
    platform: row.platform as Platform,
    command: (row.command as CrawlerTask["command"]) || "search",
    target: (row.target as string) || "",
    status: (row.status as CrawlerTask["status"]) || "pending",
    priority: "normal",
    scheduled_at: null,
    created_at: (row.created_at as string) || "",
    created_by: "system",
  };
}

function mapDbAccount(row: Record<string, unknown>): CrawlerAccount {
  return {
    id: row.id as string,
    platform: row.platform as Platform,
    alias: (row.alias as string) || (row.username as string) || "unknown",
    status: (row.status as CrawlerAccount["status"]) || "active",
    failure_count: (row.failure_count as number) || 0,
    proxy: null,
    last_used_at: (row.last_used_at as string) || null,
    created_at: (row.created_at as string) || "",
  };
}

// ─── Posts ────────────────────────────────────────────────────

export async function fetchPosts(filters?: PostFilter): Promise<CrawledPost[]> {
  try {
    let query = supabase
      .from("crawled_posts")
      .select("*")
      .order("crawled_at", { ascending: false })
      .limit(filters?.limit || 50);

    if (filters?.platform) {
      query = query.eq("platform", filters.platform);
    }
    if (filters?.search) {
      query = query.ilike("caption", `%${filters.search}%`);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapDbPost);
  } catch (err) {
    console.warn("[API] fetchPosts failed, fallback to mock:", err);
    return mockPosts;
  }
}

// ─── Authors ─────────────────────────────────────────────────

export async function fetchAuthors(filters?: AuthorFilter): Promise<CrawledAuthor[]> {
  try {
    let query = supabase
      .from("crawled_authors")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(filters?.limit || 50);

    if (filters?.platform) {
      query = query.eq("platform", filters.platform);
    }
    if (filters?.search) {
      query = query.ilike("nickname", `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapDbAuthor);
  } catch (err) {
    console.warn("[API] fetchAuthors failed, fallback to mock:", err);
    return mockAuthors;
  }
}

// ─── Tasks ───────────────────────────────────────────────────

export async function fetchTasks(): Promise<CrawlerTask[]> {
  try {
    const { data, error } = await supabase
      .from("crawler_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []).map(mapDbTask);
  } catch (err) {
    console.warn("[API] fetchTasks failed, fallback to mock:", err);
    return mockTasks;
  }
}

// ─── Create Task ─────────────────────────────────────────────

export async function createTask(task: {
  platform: Platform;
  command: string;
  target: string;
  max_count?: number;
}): Promise<CrawlerTask | null> {
  try {
    const { data, error } = await supabase
      .from("crawler_tasks")
      .insert({
        platform: task.platform,
        command: task.command,
        target: task.target,
        max_count: task.max_count || 20,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return mapDbTask(data);
  } catch (err) {
    console.error("[API] createTask failed:", err);
    return null;
  }
}

// ─── Accounts ────────────────────────────────────────────────

export async function fetchAccounts(): Promise<CrawlerAccount[]> {
  try {
    const { data, error } = await supabase
      .from("crawler_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbAccount);
  } catch (err) {
    console.warn("[API] fetchAccounts failed, fallback to mock:", err);
    return mockAccounts;
  }
}

// ─── Comments ────────────────────────────────────────────────

export async function fetchComments(postId: string): Promise<CrawledComment[]> {
  try {
    const { data, error } = await supabase
      .from("crawled_comments")
      .select("*")
      .eq("post_id", postId)
      .order("published_at", { ascending: true })
      .limit(100);

    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      post_id: row.post_id || "",
      parent_cid: row.parent_cid || null,
      content: row.content || "",
      like_count: row.like_count || 0,
      created_at: row.published_at || row.crawled_at || "",
    }));
  } catch (err) {
    console.warn("[API] fetchComments failed:", err);
    return [];
  }
}

// ─── Dashboard Metrics ───────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const [postsRes, authorsRes, tasksRes, accountsRes] = await Promise.all([
      supabase.from("crawled_posts").select("id", { count: "exact", head: true }),
      supabase.from("crawled_authors").select("id", { count: "exact", head: true }),
      supabase.from("crawler_tasks").select("id, status"),
      supabase.from("crawler_accounts").select("id, status"),
    ]);

    const totalPosts = postsRes.count || 0;
    const totalAuthors = authorsRes.count || 0;

    const tasks = tasksRes.data || [];
    const runningTasks = tasks.filter((t) => t.status === "running").length;
    const pendingTasks = tasks.filter((t) => t.status === "pending").length;

    const accounts = accountsRes.data || [];
    const activeAccounts = accounts.filter((a) => a.status === "active").length;
    const totalAccounts = accounts.length;

    return {
      totalPosts,
      totalAuthors,
      runningTasks,
      pendingTasks,
      activeAccounts,
      totalAccounts,
      postsTrend: 0,
      authorsTrend: 0,
    };
  } catch (err) {
    console.warn("[API] fetchDashboardMetrics failed, fallback to mock:", err);
    return homeMetrics;
  }
}

// ─── Platform Distribution ───────────────────────────────────

export async function fetchPlatformDistribution() {
  try {
    const { data, error } = await supabase
      .from("crawled_posts")
      .select("platform");

    if (error) throw error;

    const colorMap: Record<string, string> = {
      douyin: "#FE2C55", bilibili: "#00A1D6", xhs: "#FF2442",
      weibo: "#E6162D", kuaishou: "#FF4906", zhihu: "#0066FF",
      tieba: "#1678FF", tiktok: "#000000",
    };

    const counts: Record<string, number> = {};
    (data || []).forEach((row) => {
      counts[row.platform] = (counts[row.platform] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([platform, count]) => ({
        platform: platform as Platform,
        count,
        color: colorMap[platform] || "#666",
      }))
      .sort((a, b) => b.count - a.count);
  } catch (err) {
    console.warn("[API] fetchPlatformDistribution failed, fallback to mock:", err);
    return platformDistribution;
  }
}

// ─── Các data chưa có bảng riêng — dùng mock ────────────────

export function getProxies() { return mockProxies; }
export function getAuditLogs() { return mockAuditLogs; }
export function getConsoleLogs() { return mockConsoleLogs; }
export function getExportedFiles() { return mockExportedFiles; }
export function getTags() { return mockTags; }
export function getPermissions() { return mockPermissions; }
export function getPlatformHealth() { return platformHealth; }
export function getPostsPerDay() { return postsPerDay; }
export function getCreativeAdvertisers() { return mockCreativeAdvertisers; }
export function getCreativeAds() { return mockCreativeAds; }
