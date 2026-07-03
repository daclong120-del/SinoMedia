"use client";

import React, { useState } from "react";
import { PlatformBadge, StatusBadge, PriorityBadge } from "@/components/dashboard/Badges";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import { mockTasks, mockConsoleLogs } from "@/lib/mock-data";
import { timeAgo, cn } from "@/lib/utils";

const LOG_COLORS: Record<string, string> = {
  INFO: "text-green-400",
  DEBUG: "text-zinc-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
};

export default function TasksPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // New task form states
  const [newPlatform, setNewPlatform] = useState("Douyin (抖音)");
  const [newCategory, setNewCategory] = useState("Creator (KOL)");
  const [newPriority, setNewPriority] = useState("Normal");

  const filtered = statusFilter === "all" ? mockTasks : mockTasks.filter((t) => t.status === statusFilter);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Chiến dịch & Nhiệm vụ cào</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Tạo, lên lịch và giám sát crawler tasks</p>
        </div>
        <button onClick={() => setShowModal(true)} className="h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Tạo nhiệm vụ mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "running", "pending", "scheduled", "completed", "failed", "cancelled"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            "h-7 px-3 text-[11px] font-medium rounded-lg border transition-colors",
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
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Ưu tiên</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Trạng thái</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Tạo lúc</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5"><PlatformBadge platform={task.platform} /></td>
                  <td className="px-4 py-2.5 text-card-foreground capitalize">{task.command}</td>
                  <td className="px-4 py-2.5 text-card-foreground max-w-[200px] truncate font-mono text-[11px]">{task.target}</td>
                  <td className="px-4 py-2.5"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-2.5"><StatusBadge status={task.status} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{timeAgo(task.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setSelectedTask(task.id === selectedTask ? null : task.id)} className="text-[10px] text-primary hover:underline font-medium">
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

      {/* Console Panel */}
      {selectedTask && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[oklch(0.15_0_0)] border-b border-white/10">
            <span className="text-[11px] text-zinc-400 font-mono">Console — Task {selectedTask}</span>
            <button onClick={() => setSelectedTask(null)} className="text-zinc-500 hover:text-zinc-300 text-[10px]">Đóng ✕</button>
          </div>
          <div className="bg-[oklch(0.12_0_0)] p-4 font-mono text-xs space-y-0.5 max-h-[300px] overflow-y-auto">
            {mockConsoleLogs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-zinc-600 shrink-0">{new Date(log.created_at).toLocaleTimeString("vi-VN")}</span>
                <span className={cn("font-semibold shrink-0 w-12", LOG_COLORS[log.level] || "text-zinc-400")}>[{log.level}]</span>
                <span className="text-zinc-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-card-foreground">Tạo nhiệm vụ cào mới</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-6">
              {/* Form groups */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-foreground border-b border-border pb-2">Cấu hình mục tiêu</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Nền tảng *</span>
                    <DropdownSelect
                      value={newPlatform}
                      onChange={setNewPlatform}
                      options={[
                        "Douyin (抖音)",
                        "XHS / Tiểu Hồng Thư",
                        "Bilibili (哔哩哔哩)",
                        "Weibo (微博)",
                        "Kuaishou (快手)",
                        "Tieba (贴吧)",
                        "Zhihu (知乎)",
                        "TikTok"
                      ]}
                      fullWidth
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Danh mục cào *</span>
                    <DropdownSelect
                      value={newCategory}
                      onChange={setNewCategory}
                      options={[
                        "Creator (KOL)",
                        "Search (Từ khóa)",
                        "Comment",
                        "Ads Target"
                      ]}
                      fullWidth
                    />
                  </label>
                </div>
                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-muted-foreground">Target / Từ khóa *</span>
                  <textarea rows={3} placeholder="Nhập mỗi target một dòng..." className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground resize-none" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Số lượng tối đa</span>
                    <input type="number" defaultValue={50} className="w-full h-8 px-2 text-xs border border-border rounded-lg bg-background text-foreground" />
                  </label>
                  <label className="space-y-1">
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
                <h3 className="text-xs font-semibold text-foreground border-b border-border pb-2">Cấu hình đầu ra</h3>
                <label className="flex items-center gap-2 text-xs text-card-foreground">
                  <input type="checkbox" className="rounded" />
                  Tải Media về R2
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="h-8 px-4 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted">Hủy</button>
              <button onClick={() => setShowModal(false)} className="h-8 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Tạo nhiệm vụ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
