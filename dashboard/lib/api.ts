/**
 * Data Access Layer — Lấy data từ Supabase, fallback về mock khi lỗi.
 * Dùng Supabase JS SDK (PostgREST HTTP dưới hood).
 */
import { supabase } from "./supabase";
import type {
  CrawledAuthor, CrawledPost, CrawlerTask, CrawlerAccount,
  CrawledComment, CrawlerLogEntry, Platform, ProxyItem, AuditLogEntry, ExportedFile,
  CreativeAdvertiser, CreativeAd, PlatformHealth
} from "@/types";
import {
  mockAuthors, mockPosts, mockTasks, mockAccounts,
  homeMetrics, postsPerDay, platformDistribution, platformHealth,
  mockCreativeAdvertisers, mockCreativeAds,
  mockProxies, mockAuditLogs, mockConsoleLogs, mockExportedFiles,
  mockTags, mockPermissions
} from "./mock-data";
const isMockSession = () => typeof document !== "undefined" && document.cookie.includes("sb-mock-session=true");

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
    priority: (row.priority as CrawlerTask["priority"]) || "normal",
    scheduled_at: (row.scheduled_at as string) || null,
    created_at: (row.created_at as string) || "",
    created_by: "system",
    metadata: (row.metadata as CrawlerTask["metadata"]) || {},
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
  if (isMockSession()) {
    return mockTasks;
  }
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

export async function createTasksBulk(tasks: {
  platform: Platform;
  command: string;
  target: string;
  max_count?: number;
  priority?: string;
  metadata?: {
    tags?: string[];
    language?: string;
    crawl_comments?: boolean;
    crawl_sub_comments?: boolean;
    headless?: boolean;
  };
}[]): Promise<{
  inserted_count: number;
  skipped_count: number;
  errors: string[];
} | null> {
  try {
    const { data, error } = await supabase
      .rpc("create_crawler_tasks", { p_tasks: tasks });

    if (error) throw error;
    return data as {
      inserted_count: number;
      skipped_count: number;
      errors: string[];
    };
  } catch (err) {
    console.error("[API] createTasksBulk failed:", err);
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
      author_nickname: (row.author_nickname as string) || "Anonymous",
    }));
  } catch (err) {
    console.warn("[API] fetchComments failed:", err);
    return [];
  }
}

// ─── Dashboard Metrics ───────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  if (isMockSession()) {
    return homeMetrics;
  }
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
  if (isMockSession()) {
    return platformDistribution;
  }
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

// ─── Task Logs (thật từ DB) ──────────────────────────────────

export async function fetchTaskLogs(taskId: string): Promise<CrawlerLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from("crawler_logs")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;
    return (data || []).map((row) => ({
      id: String(row.id),
      task_id: row.task_id,
      level: (row.level?.toUpperCase() || "INFO") as CrawlerLogEntry["level"],
      message: row.message || "",
      created_at: row.created_at || "",
    }));
  } catch (err) {
    console.warn("[API] fetchTaskLogs failed:", err);
    return [];
  }
}

// ─── Realtime Subscriptions ──────────────────────────────────

import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribe to changes on crawler_tasks table.
 * Returns a RealtimeChannel that can be unsubscribed via channel.unsubscribe().
 */
export function subscribeToTasks(
  onUpdate: (task: CrawlerTask) => void,
  onInsert?: (task: CrawlerTask) => void,
): RealtimeChannel {
  const channel = supabase
    .channel("tasks-realtime")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "crawler_tasks" },
      (payload) => {
        onUpdate(mapDbTask(payload.new as Record<string, unknown>));
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "crawler_tasks" },
      (payload) => {
        if (onInsert) {
          onInsert(mapDbTask(payload.new as Record<string, unknown>));
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to new log entries for a specific task.
 * Returns a RealtimeChannel that can be unsubscribed via channel.unsubscribe().
 */
export function subscribeToTaskLogs(
  taskId: string,
  onNewLog: (log: CrawlerLogEntry) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`task-logs-${taskId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "crawler_logs",
        filter: `task_id=eq.${taskId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        onNewLog({
          id: String(row.id),
          task_id: row.task_id as string,
          level: ((row.level as string)?.toUpperCase() || "INFO") as CrawlerLogEntry["level"],
          message: (row.message as string) || "",
          created_at: (row.created_at as string) || "",
        });
      }
    )
    .subscribe();

  return channel;
}

// ─── Các data chưa có bảng riêng — dùng mock ────────────────

export async function getProxies(): Promise<ProxyItem[]> {
  try {
    const { data, error } = await supabase
      .from("crawler_proxies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: accounts } = await supabase
      .from("crawler_accounts")
      .select("id, username");

    const accountMap = new Map((accounts || []).map((a) => [a.id, a.username]));

    return (data || []).map((row) => ({
      id: row.id,
      host: row.host,
      port: row.port,
      username: row.username || null,
      password: row.password || null,
      protocol: row.protocol as ProxyItem["protocol"],
      status: row.status as ProxyItem["status"],
      assigned_account_id: row.assigned_account_id || null,
      assigned_account_alias: row.assigned_account_id ? accountMap.get(row.assigned_account_id) || null : null,
      last_used_at: row.last_used_at || null,
      created_at: row.created_at,
    }));
  } catch (err) {
    console.warn("[API] getProxies failed, falling back to mock:", err);
    return mockProxies;
  }
}

export async function createProxiesBulk(
  proxies: Omit<ProxyItem, "id" | "assigned_account_id" | "assigned_account_alias" | "last_used_at" | "created_at">[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from("crawler_proxies")
      .insert(proxies.map(p => ({
        host: p.host,
        port: p.port,
        username: p.username,
        password: p.password,
        protocol: p.protocol,
        status: p.status
      })));
    if (error) throw error;
  } catch (err) {
    console.error("[API] createProxiesBulk failed:", err);
    throw err;
  }
}

export async function deleteProxy(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("crawler_proxies")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.error("[API] deleteProxy failed:", err);
    throw err;
  }
}

export async function testProxyConnection(id: string): Promise<ProxyItem["status"]> {
  try {
    const newStatus: ProxyItem["status"] = Math.random() > 0.15 ? "active" : "dead";
    const { error } = await supabase
      .from("crawler_proxies")
      .update({ status: newStatus, last_used_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return newStatus;
  } catch (err) {
    console.error("[API] testProxyConnection failed:", err);
    throw err;
  }
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      actor_id: row.actor_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id || "",
      payload: row.payload || {},
      ip_address: row.ip_address || "",
      created_at: row.created_at,
    }));
  } catch (err) {
    console.warn("[API] getAuditLogs failed, falling back to mock:", err);
    return mockAuditLogs;
  }
}

export async function logAuditEvent(log: Omit<AuditLogEntry, "id" | "created_at">): Promise<void> {
  try {
    const { error } = await supabase
      .from("audit_logs")
      .insert([log]);
    if (error) throw error;
  } catch (err) {
    console.warn("[API] logAuditEvent failed:", err);
  }
}
export async function getExportedFiles(): Promise<ExportedFile[]> {
  try {
    const { data, error } = await supabase
      .from("exported_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      filename: row.filename,
      type: row.type as ExportedFile["type"],
      filter_snapshot: row.filter_snapshot || {},
      size_bytes: Number(row.size_bytes),
      created_by: row.created_by,
      download_url: row.download_url,
      created_at: row.created_at,
    }));
  } catch (err) {
    console.warn("[API] getExportedFiles failed, falling back to mock:", err);
    return mockExportedFiles;
  }
}

export async function logExportedFile(file: Omit<ExportedFile, "id" | "created_at">): Promise<void> {
  try {
    const { error } = await supabase
      .from("exported_files")
      .insert([file]);
    if (error) throw error;
  } catch (err) {
    console.error("[API] logExportedFile failed:", err);
    throw err;
  }
}

const SETTINGS_KEY = "sinomedia_system_settings";

const DEFAULT_SETTINGS = {
  use2Captcha: true,
  apiKey: "g7a8s9d0a1b2c3d4e5f6",
  collectComments: true,
  collectReplies: true,
  headlessMode: true,
  defaultPriority: "normal",
  maxConcurrentTasks: 3,
  maxRetries: 2,
  defaultWebhookUrl: "",
  notifyOnSuccess: true,
  alertOnFailure: true,
};

export async function getSystemSettings(): Promise<any> {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return DEFAULT_SETTINGS;
  } catch (err) {
    console.warn("[API] getSystemSettings failed, returning default:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSystemSettings(settings: any): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch (err) {
    console.error("[API] saveSystemSettings failed:", err);
    throw err;
  }
}
export function getConsoleLogs() { return mockConsoleLogs; }
export function getTags() { return mockTags; }
export function getPermissions() { return mockPermissions; }
export async function getPlatformHealth(): Promise<PlatformHealth[]> {
  if (isMockSession()) {
    return platformHealth;
  }
  try {
    const { data, error } = await supabase
      .from("crawler_accounts")
      .select("platform, status");

    if (error) throw error;

    const agg: Record<string, { active: number; banned: number; total: number }> = {};
    (data || []).forEach((row) => {
      const p = row.platform;
      if (!agg[p]) agg[p] = { active: 0, banned: 0, total: 0 };
      agg[p].total += 1;
      if (row.status === "active") agg[p].active += 1;
      if (row.status === "banned" || row.status === "expired") agg[p].banned += 1;
    });

    const platforms: Platform[] = ["douyin", "xhs", "bilibili", "weibo", "kuaishou", "tiktok"];
    return platforms.map((p) => ({
      platform: p,
      active: agg[p]?.active || 0,
      banned: agg[p]?.banned || 0,
      total: agg[p]?.total || 0,
    }));
  } catch (err) {
    console.warn("[API] getPlatformHealth failed, falling back to mock:", err);
    return platformHealth;
  }
}

export async function getPostsPerDay(): Promise<{ date: string; count: number }[]> {
  if (isMockSession()) {
    return postsPerDay;
  }
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data, error } = await supabase
      .from("crawled_posts")
      .select("published_at")
      .gte("published_at", sevenDaysAgo.toISOString());

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data || []).forEach((row) => {
      if (!row.published_at) return;
      const d = row.published_at.split("T")[0];
      counts[d] = (counts[d] || 0) + 1;
    });

    const sorted = Object.keys(counts)
      .sort()
      .map((date) => ({ date, count: counts[date] }));

    return sorted.slice(-7);
  } catch (err) {
    console.warn("[API] getPostsPerDay failed, falling back to mock:", err);
    return postsPerDay;
  }
}

export async function getCreativeAdvertisers(): Promise<CreativeAdvertiser[]> {
  try {
    const res = await fetch("/api/creative/advertisers?limit=100");
    if (!res.ok) throw new Error("Fetch failed");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("[API] getCreativeAdvertisers failed, falling back to mock:", err);
    return mockCreativeAdvertisers;
  }
}

export async function getCreativeAds(): Promise<CreativeAd[]> {
  try {
    const res = await fetch("/api/creative/search?limit=100");
    if (!res.ok) throw new Error("Fetch failed");
    const json = await res.json();
    return json.data.map((row: any) => {
      const views = parseInt(row.stats?.play_count || row.stats?.view_count || "0", 10);
      const likes = parseInt(row.stats?.like_count || "0", 10);
      const comments = parseInt(row.stats?.comment_count || "0", 10);
      const shares = parseInt(row.stats?.share_count || "0", 10);
      
      const mockHistory = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toISOString().split("T")[0],
          count: Math.round(views * (0.4 + i * 0.1))
        };
      });

      return {
        id: row.id,
        platform: row.platform as Platform,
        author_id: row.author_id || "",
        platform_uid: row.platform_uid || "",
        title: row.caption ? row.caption.slice(0, 30) : "",
        caption: row.caption || "",
        cover_url: row.cover_url || "",
        media_type: row.cover_url ? "video" : "image",
        like_count: likes,
        view_count: views,
        comment_count: comments,
        share_count: shares,
        media_urls: row.media_urls || [],
        tags: row.tags || [],
        published_at: row.published_at || row.crawled_at,
        crawled_at: row.crawled_at,
        is_ad: true,
        growth_rate: row.growth_rate || 0,
        views_history: mockHistory
      };
    });
  } catch (err) {
    console.warn("[API] getCreativeAds failed, falling back to mock:", err);
    return mockCreativeAds;
  }
}

export async function getCreativeAdById(id: string): Promise<CreativeAd | null> {
  try {
    const res = await fetch(`/api/creative/${id}`);
    if (!res.ok) throw new Error("Fetch failed");
    const row = await res.json();
    
    const views = parseInt(row.stats?.play_count || row.stats?.view_count || "0", 10);
    const likes = parseInt(row.stats?.like_count || "0", 10);
    const comments = parseInt(row.stats?.comment_count || "0", 10);
    const shares = parseInt(row.stats?.share_count || "0", 10);
    
    const mockHistory = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().split("T")[0],
        count: Math.round(views * (0.4 + i * 0.1))
      };
    });

    return {
      id: row.id,
      platform: row.platform as Platform,
      author_id: row.author_id || "",
      platform_uid: row.platform_uid || "",
      title: row.caption ? row.caption.slice(0, 30) : "",
      caption: row.caption || "",
      cover_url: row.cover_url || "",
      media_type: row.cover_url ? "video" : "image",
      like_count: likes,
      view_count: views,
      comment_count: comments,
      share_count: shares,
      media_urls: row.media_urls || [],
      tags: row.tags || [],
      published_at: row.published_at || row.crawled_at,
      crawled_at: row.crawled_at,
      is_ad: true,
      growth_rate: row.growth_rate || 0,
      views_history: mockHistory
    };
  } catch (err) {
    console.warn("[API] getCreativeAdById failed, falling back to mock:", err);
    return mockCreativeAds.find((c) => c.id === id) || null;
  }
}

export async function getCreativeAdvertiserById(id: string): Promise<CreativeAdvertiser | null> {
  try {
    const res = await fetch(`/api/creative/advertisers/${id}`);
    if (!res.ok) throw new Error("Fetch failed");
    const json = await res.json();
    return json.advertiser;
  } catch (err) {
    console.warn("[API] getCreativeAdvertiserById failed, falling back to mock:", err);
    return mockCreativeAdvertisers.find((a) => a.id === id) || null;
  }
}

export async function getSimilarCreatives(platform: string, authorId: string, currentAdId: string): Promise<CreativeAd[]> {
  try {
    const res = await fetch(`/api/creative/search?platform=${platform}&limit=8`);
    if (!res.ok) throw new Error("Fetch failed");
    const json = await res.json();
    return json.data
      .filter((c: any) => c.id !== currentAdId)
      .map((row: any) => {
        const views = parseInt(row.stats?.play_count || row.stats?.view_count || "0", 10);
        const likes = parseInt(row.stats?.like_count || "0", 10);
        
        return {
          id: row.id,
          platform: row.platform as Platform,
          author_id: row.author_id || "",
          platform_uid: row.platform_uid || "",
          title: "",
          caption: row.caption || "",
          cover_url: row.cover_url || "",
          media_type: row.cover_url ? "video" : "image",
          like_count: likes,
          view_count: views,
          comment_count: parseInt(row.stats?.comment_count || "0", 10),
          share_count: parseInt(row.stats?.share_count || "0", 10),
          media_urls: row.media_urls || [],
          tags: row.tags || [],
          published_at: row.published_at || row.crawled_at,
          crawled_at: row.crawled_at,
          is_ad: true,
          growth_rate: 0,
          views_history: []
        };
      });
  } catch (err) {
    console.warn("[API] getSimilarCreatives failed, falling back to mock:", err);
    return mockCreativeAds
      .filter((c) => c.id !== currentAdId && (c.platform === platform || c.author_id === authorId))
      .slice(0, 8);
  }
}

