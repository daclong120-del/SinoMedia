"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { PlatformBadge, StatusBadge, PriorityBadge } from "@/components/dashboard/Badges";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import TagInput from "@/components/dashboard/TagInput";
import { getTasks, getTaskLogs, createTasksBulk } from "@/lib/actions/crawler.actions";
import { subscribeToTasks, subscribeToTaskLogs } from "@/lib/realtime/subscriptions";
import { timeAgo, cn } from "@/lib/utils";
import type { CrawlerTask, CrawlerLogEntry, Platform } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { X, AlertCircle, Radio } from "lucide-react";

const LOG_COLORS: Record<string, string> = {
  INFO: "text-green-400",
  DEBUG: "text-zinc-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
};

const PLATFORM_MAP: Record<string, Platform> = {
  "Douyin": "douyin",
  "XHS / Tiểu Hồng Thư": "xhs",
  "Bilibili": "bilibili",
  "Weibo": "weibo",
  "Kuaishou": "kuaishou",
  "Tieba": "tieba",
  "Zhihu": "zhihu",
  "TikTok": "tiktok"
};

const COMMAND_MAP: Record<string, string> = {
  "Creator": "creator",
  "Search": "search",
  "Comment": "comment",
  "Ads Target": "ads"
};

const PRIORITY_MAP: Record<string, string> = {
  "Normal": "normal",
  "Critical": "critical",
  "High": "high",
  "Low": "low"
};

const LANGUAGE_MAP: Record<string, string> = {
  "Auto": "auto",
  "Trung Quốc (zh)": "zh",
  "Tiếng Anh (en)": "en",
  "Tiếng Việt (vi)": "vi"
};

export default function TasksPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tasks, setTasks] = useState<CrawlerTask[]>([]);
  const [taskLogs, setTaskLogs] = useState<CrawlerLogEntry[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  // New task form states
  const [newPlatform, setNewPlatform] = useState("Douyin");
  const [newCategory, setNewCategory] = useState("Creator");
  const [newPriority, setNewPriority] = useState("Normal");
  const [newTargets, setNewTargets] = useState("");
  const [newMaxCount, setNewMaxCount] = useState(50);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState("Auto");
  const [crawlComments, setCrawlComments] = useState(true);
  const [crawlSubComments, setCrawlSubComments] = useState(true);
  const [headlessMode, setHeadlessMode] = useState(true);
  const [uploadR2, setUploadR2] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Notification & Feedback States
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: "success" | "error" | "info" }>({
    show: false,
    message: "",
    type: "success"
  });
  const [errorsList, setErrorsList] = useState<string[]>([]);

  // Refs for realtime channels
  const tasksChannelRef = useRef<RealtimeChannel | null>(null);
  const logsChannelRef = useRef<RealtimeChannel | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // ─── Initial data load ─────────────────────────────────────
  useEffect(() => {
    async function load() {
      const data = await getTasks();
      setTasks(data);
    }
    load();
  }, []);

  // ─── Realtime: Tasks table ─────────────────────────────────
  useEffect(() => {
    const channel = subscribeToTasks(
      // onUpdate: merge updated task into state
      (updatedTask) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
      },
      // onInsert: prepend new task to list
      (newTask) => {
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          return [newTask, ...prev];
        });
      }
    );

    tasksChannelRef.current = channel;
    setIsRealtimeConnected(true);

    return () => {
      channel.unsubscribe();
      tasksChannelRef.current = null;
      setIsRealtimeConnected(false);
    };
  }, []);

  // ─── Realtime: Task Logs (per selected task) ───────────────
  const loadAndSubscribeLogs = useCallback(async (taskId: string) => {
    // Fetch existing logs first
    const existingLogs = await getTaskLogs(taskId);
    setTaskLogs(existingLogs);

    // Subscribe to new logs
    const channel = subscribeToTaskLogs(taskId, (newLog) => {
      setTaskLogs((prev) => {
        if (prev.some((l) => l.id === newLog.id)) return prev;
        return [...prev, newLog];
      });
    });

    logsChannelRef.current = channel;
  }, []);

  useEffect(() => {
    // Cleanup previous log subscription
    if (logsChannelRef.current) {
      logsChannelRef.current.unsubscribe();
      logsChannelRef.current = null;
    }

    if (selectedTask) {
      setTaskLogs([]); // Clear immediately
      loadAndSubscribeLogs(selectedTask);
    }

    return () => {
      if (logsChannelRef.current) {
        logsChannelRef.current.unsubscribe();
        logsChannelRef.current = null;
      }
    };
  }, [selectedTask, loadAndSubscribeLogs]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [taskLogs]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const handleCreateTasks = async () => {
    if (!newTargets.trim()) {
      showToast("Vui lòng nhập mục tiêu cào (Target / Từ khóa).", "error");
      return;
    }

    const lines = newTargets
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      showToast("Vui lòng nhập mục tiêu cào (Target / Từ khóa).", "error");
      return;
    }

    // Check target length limit of 500 chars
    const overLimitLine = lines.find(line => line.length > 500);
    if (overLimitLine) {
      showToast("Mỗi dòng target không được vượt quá 500 ký tự.", "error");
      return;
    }

    // Client-side case-insensitive deduplication
    const uniqueLines = Array.from(new Set(lines.map(l => l.toLowerCase()))).map(lower => {
      return lines.find(l => l.toLowerCase() === lower) || lower;
    });

    if (uniqueLines.length > 50) {
      showToast("Số lượng nhiệm vụ tối đa cho mỗi lượt gửi là 50.", "error");
      return;
    }

    setIsSubmitting(true);
    setErrorsList([]);

    const platformKey = PLATFORM_MAP[newPlatform] || "douyin";
    const commandKey = COMMAND_MAP[newCategory] || "creator";
    const priorityKey = PRIORITY_MAP[newPriority] || "normal";

    const payload = uniqueLines.map(target => ({
      platform: platformKey,
      command: commandKey,
      target: target,
      max_count: Number(newMaxCount) || 50,
      priority: priorityKey,
      metadata: {
        tags: newTags,
        language: LANGUAGE_MAP[newLanguage] || "auto",
        crawl_comments: crawlComments,
        crawl_sub_comments: crawlSubComments,
        headless: headlessMode,
        upload_r2: uploadR2
      }
    }));

    const result = await createTasksBulk(payload);
    setIsSubmitting(false);

    if (!result) {
      showToast("Tạo nhiệm vụ thất bại, lỗi hệ thống hoặc kết nối.", "error");
      return;
    }

    const { inserted_count, skipped_count, errors } = result;

    if (inserted_count > 0) {
      if (skipped_count > 0) {
        showToast(`Đã tạo thành công ${inserted_count} nhiệm vụ. Bỏ qua ${skipped_count} nhiệm vụ trùng lặp.`, "success");
      } else {
        showToast(`Đã tạo thành công ${inserted_count} nhiệm vụ.`, "success");
      }
      // No manual reload needed — Realtime INSERT will push new tasks into state
      
      // Reset targets input and close modal
      setNewTargets("");
      setNewMaxCount(50);
      setNewTags([]);
      setNewLanguage("Auto");
      setCrawlComments(true);
      setCrawlSubComments(true);
      setHeadlessMode(true);
      setUploadR2(true);
      setShowModal(false);
      setErrorsList([]);
    } else {
      showToast(`Không nhiệm vụ nào được thêm mới (bỏ qua ${skipped_count} nhiệm vụ trùng).`, "info");
      if (errors && errors.length > 0) {
        setErrorsList(errors);
      }
    }
  };

  const filtered = statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6 select-none relative">
      
      {/* Toast Notification */}
      {notification.show && (
        <div className={cn(
          "fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-lg bg-card text-foreground animate-in slide-in-from-top-4 duration-300",
          notification.type === "success" ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
          notification.type === "error" ? "border-red-500/20 text-red-500" : "border-amber-500/20 text-amber-500"
        )}>
          <div className={cn(
            "h-2 w-2 rounded-full",
            notification.type === "success" ? "bg-emerald-500" :
            notification.type === "error" ? "bg-red-500" : "bg-amber-500"
          )} />
          <p className="text-xs font-semibold">{notification.message}</p>
          <button onClick={() => setNotification(prev => ({ ...prev, show: false }))} className="ml-2 hover:bg-muted p-0.5 rounded text-muted-foreground transition-colors cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Chiến dịch & Nhiệm vụ cào</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            Tạo, lên lịch và giám sát crawler tasks
            {isRealtimeConnected && (
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <Radio size={10} className="animate-pulse" />
                <span className="text-[10px] font-medium">Live</span>
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Tạo nhiệm vụ mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "running", "pending", "scheduled", "completed", "failed", "cancelled"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            "h-7 px-3 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer",
            statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
          )}>
            {s === "all" ? "Tất cả" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Task Queue Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Nền tảng</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Loại</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Target</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Cấu hình & Nhãn</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Ưu tiên</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Trạng thái</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Tạo lúc</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className={cn(
                  "border-b border-border/50 hover:bg-muted/20 transition-colors",
                  task.status === "running" && "bg-primary/5"
                )}>
                  <td className="px-4 py-2.5"><PlatformBadge platform={task.platform} /></td>
                  <td className="px-4 py-2.5 text-card-foreground capitalize">{task.command}</td>
                  <td className="px-4 py-2.5 text-card-foreground max-w-[200px] truncate font-mono text-[11px]">{task.target}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1">
                      {/* Configuration Badges */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {task.metadata?.headless !== undefined && (
                          <span className={cn(
                            "px-1 py-0.5 rounded text-[9px] font-medium border",
                            task.metadata.headless ? "bg-zinc-900 border-zinc-700 text-zinc-400" : "bg-orange-950 border-orange-900/50 text-orange-400"
                          )}>
                            {task.metadata.headless ? "headless" : "headful"}
                          </span>
                        )}
                        {task.metadata?.crawl_comments && (
                          <span className="px-1 py-0.5 rounded text-[9px] font-medium bg-blue-950 border border-blue-900/50 text-blue-400">
                            comments
                            {task.metadata?.crawl_sub_comments && "+sub"}
                          </span>
                        )}
                        {task.metadata?.language && task.metadata.language !== "auto" && (
                          <span className="px-1 py-0.5 rounded text-[9px] font-medium bg-purple-950 border border-purple-900/50 text-purple-400">
                            lang: {task.metadata.language}
                          </span>
                        )}
                      </div>
                      {/* Tags Badges */}
                      {task.metadata?.tags && task.metadata.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {task.metadata.tags.map((tag, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={task.status} />
                    {task.status === "running" && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{timeAgo(task.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setSelectedTask(task.id === selectedTask ? null : task.id)} className="text-[10px] text-primary hover:underline font-medium cursor-pointer">
                      {task.id === selectedTask ? "Ẩn Log" : "Xem Log"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-xs">
            <p className="font-medium">Không có task nào</p>
          </div>
        )}
      </div>

      {/* Console Panel — Live Logs */}
      {selectedTask && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[oklch(0.15_0_0)] border-b border-white/10">
            <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
              Console — Task {selectedTask.slice(0, 8)}…
              <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]">
                <Radio size={8} className="animate-pulse" />
                Live
              </span>
            </span>
            <button onClick={() => setSelectedTask(null)} className="text-zinc-500 hover:text-zinc-300 text-[10px] cursor-pointer">Đóng ✕</button>
          </div>
          <div className="bg-[oklch(0.12_0_0)] p-4 font-mono text-xs space-y-0.5 max-h-[300px] overflow-y-auto">
            {taskLogs.length === 0 && (
              <div className="text-zinc-600 text-center py-4">Chưa có log nào cho task này.</div>
            )}
            {taskLogs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-zinc-600 shrink-0">{new Date(log.created_at).toLocaleTimeString("vi-VN")}</span>
                <span className={cn("font-semibold shrink-0 w-12", LOG_COLORS[log.level] || "text-zinc-400")}>[{log.level}]</span>
                <span className="text-zinc-300">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl flex flex-col animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-card-foreground">Tạo nhiệm vụ cào mới</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>
            
            <div className="p-6 space-y-6 flex-1">
              {/* Warnings List if any duplicate task exists */}
              {errorsList.length > 0 && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg space-y-1.5 flex gap-2 items-start">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Phát hiện nhiệm vụ đã trùng lặp hoặc đang chờ xử lý:</p>
                    <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto font-mono text-[10px]">
                      {errorsList.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Form groups */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-foreground border-b border-border pb-2">Cấu hình mục tiêu</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-muted-foreground">Nền tảng *</span>
                    <DropdownSelect
                      value={newPlatform}
                      onChange={setNewPlatform}
                      options={[
                        "Douyin",
                        "XHS / Tiểu Hồng Thư",
                        "Bilibili",
                        "Weibo",
                        "Kuaishou",
                        "Tieba",
                        "Zhihu",
                        "TikTok"
                      ]}
                      fullWidth
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-muted-foreground">Danh mục cào *</span>
                    <DropdownSelect
                      value={newCategory}
                      onChange={setNewCategory}
                      options={[
                        "Creator",
                        "Search",
                        "Comment",
                        "Ads Target"
                      ]}
                      fullWidth
                    />
                  </label>
                </div>
                
                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-muted-foreground">Target / Từ khóa * (Nhập mỗi mục một dòng, tối đa 50 dòng, tối đa 500 ký tự/dòng)</span>
                  <textarea 
                    rows={4} 
                    placeholder={"Nhập mỗi target một dòng...\nVí dụ:\nhttps://www.douyin.com/user/MS4wLjABAAAA...\ntừ khóa tìm kiếm"} 
                    value={newTargets}
                    onChange={(e) => setNewTargets(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono" 
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-muted-foreground">Số lượng bài viết tối đa</span>
                    <input 
                      type="number" 
                      min={1}
                      max={1000}
                      value={newMaxCount} 
                      onChange={(e) => setNewMaxCount(Number(e.target.value))}
                      className="w-full h-8 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-primary" 
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-muted-foreground">Mức ưu tiên</span>
                    <DropdownSelect
                      value={newPriority}
                      onChange={setNewPriority}
                      options={[
                        "Normal",
                        "Critical",
                        "High",
                        "Low"
                      ]}
                      fullWidth
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground border-b border-border pb-2">Cấu hình đầu ra & Chạy</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">Tags (phân tách bằng dấu phẩy)</span>
                    <TagInput tags={newTags} onChange={setNewTags} placeholder="Ví dụ: hot, tin_tuc, giải_trí" />
                  </div>
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-muted-foreground">Ngôn ngữ phân tích</span>
                    <DropdownSelect
                      value={newLanguage}
                      onChange={setNewLanguage}
                      options={[
                        "Auto",
                        "Trung Quốc (zh)",
                        "Tiếng Anh (en)",
                        "Tiếng Việt (vi)"
                      ]}
                      fullWidth
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <label className="flex items-center gap-2 text-xs text-card-foreground cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={headlessMode}
                      onChange={(e) => setHeadlessMode(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5 bg-background" 
                    />
                    Chạy ẩn danh (Headless Mode)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-card-foreground cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={crawlComments}
                      onChange={(e) => setCrawlComments(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5 bg-background" 
                    />
                    Cào bình luận bài đăng (Crawl Comments)
                  </label>
                  {crawlComments && (
                    <label className="flex items-center gap-2 text-xs text-card-foreground pl-5 cursor-pointer animate-in fade-in slide-in-from-left-2 duration-150">
                      <input 
                        type="checkbox" 
                        checked={crawlSubComments}
                        onChange={(e) => setCrawlSubComments(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary size-3.5 bg-background" 
                      />
                      Cào bình luận phụ (Crawl Sub-comments)
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-xs text-card-foreground cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={uploadR2}
                      onChange={(e) => setUploadR2(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5 bg-background" 
                    />
                    Tải Media về R2 Storage
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
              <button 
                onClick={() => setShowModal(false)} 
                disabled={isSubmitting}
                className="h-8 px-4 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleCreateTasks} 
                disabled={isSubmitting}
                className="h-8 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? "Đang xử lý..." : "Tạo nhiệm vụ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
