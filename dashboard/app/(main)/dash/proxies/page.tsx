"use client";

import React, { useState } from "react";
import MetricCard from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/Badges";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import { mockProxies } from "@/lib/mock-data";
import { timeAgo, cn } from "@/lib/utils";

export default function ProxiesPage() {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [proxyProto, setProxyProto] = useState("HTTP");

  const activeCount = mockProxies.filter((p) => p.status === "active").length;
  const inactiveCount = mockProxies.filter((p) => p.status === "inactive").length;
  const deadCount = mockProxies.filter((p) => p.status === "dead").length;

  const filtered = statusFilter === "all" ? mockProxies : mockProxies.filter((p) => p.status === statusFilter);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Quản lý Proxy Pool</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Nạp và gán proxy cho các tài khoản crawler</p>
        </div>
        <button onClick={() => setShowModal(true)} className="h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nạp Proxy
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Tổng Active" value={activeCount} icon={<svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>} color="emerald" />
        <MetricCard label="Tổng Inactive" value={inactiveCount} icon={<svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>} color="orange" />
        <MetricCard label="Tổng Dead" value={deadCount} icon={<svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>} color="red" />
        <MetricCard label="Tổng Proxy" value={mockProxies.length} icon={<svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="8" x="2" y="2" rx="2" ry="2" /><rect width="20" height="8" x="2" y="14" rx="2" ry="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" /></svg>} color="blue" />
      </div>

      {/* Mode info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="text-xs font-bold text-card-foreground flex items-center gap-1.5 mb-1">
            <span className="size-2 rounded-full bg-emerald-500" />
            Sticky Proxy
          </h3>
          <p className="text-[11px] text-muted-foreground leading-normal">Gán 1 proxy cố định cho 1 tài khoản cụ thể tại trang <code className="bg-muted px-1 py-0.5 rounded text-[10px]">Tài khoản cào</code>. Crawler sẽ chỉ dùng proxy này để đăng nhập và giữ session cho tài khoản đó.</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="text-xs font-bold text-card-foreground flex items-center gap-1.5 mb-1">
            <span className="size-2 rounded-full bg-blue-500" />
            Rotating Pool
          </h3>
          <p className="text-[11px] text-muted-foreground leading-normal">Proxy không gán cho tài khoản nào sẽ được tự động xếp vào Rotating Pool. Crawler sẽ xoay vòng ngẫu nhiên danh sách này để thực hiện các request cào công khai như Search hoặc Post Detail.</p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "active", "inactive", "dead"].map((status) => (
            <button key={status} onClick={() => setStatusFilter(status)} className={cn(
              "h-7 px-3 text-[11px] font-medium rounded-lg border transition-colors",
              statusFilter === status ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
            )}>
              {status === "all" ? "Tất cả" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">IP:Port</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Giao thức</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Tài khoản Proxy</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Gán cho Account</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Dùng lần cuối</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-card-foreground">{p.host}:{p.port}</td>
                    <td className="px-4 py-2.5 uppercase font-medium text-card-foreground">{p.protocol}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.username || "Anonymous"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-2.5 text-card-foreground font-semibold">{p.assigned_account_alias || <span className="italic text-zinc-400 font-normal">Rotating Pool</span>}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.last_used_at ? timeAgo(p.last_used_at) : "—"}</td>
                    <td className="px-4 py-2.5 flex items-center gap-3">
                      <button className="text-[10px] text-primary hover:underline font-medium">Test Proxy</button>
                      <button className="text-[10px] text-destructive hover:underline font-medium">Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Proxy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border w-full max-w-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-card-foreground">Nạp Proxy mới</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <label className="space-y-1 block"><span className="text-[11px] font-medium text-muted-foreground">Giao thức *</span>
                <DropdownSelect
                  value={proxyProto}
                  onChange={setProxyProto}
                  options={["HTTP", "SOCKS5"]}
                  fullWidth
                />
              </label>
              <label className="space-y-1 block"><span className="text-[11px] font-medium text-muted-foreground">Danh sách proxy *</span>
                <textarea rows={6} placeholder="IP:Port
IP:Port:User:Pass
45.123.45.6:1080:username:password" className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground font-mono resize-none" />
              </label>
              <p className="text-[10px] text-muted-foreground leading-normal">Hệ thống hỗ trợ tự động tách IP, Cổng, Username, Password. Có thể nạp số lượng lớn cùng lúc.</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="h-8 px-4 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted">Hủy</button>
              <button onClick={() => setShowModal(false)} className="h-8 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Nạp Proxy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
