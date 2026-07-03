"use client";

import React, { useState } from "react";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import { mockAuditLogs } from "@/lib/mock-data";
import { timeAgo } from "@/lib/utils";

export default function AuditLogsPage() {
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const actors = Array.from(new Set(mockAuditLogs.map((log) => log.actor_id)));
  const actions = Array.from(new Set(mockAuditLogs.map((log) => log.action)));

  const filtered = mockAuditLogs.filter((log) => {
    const matchesActor = actorFilter === "all" || log.actor_id === actorFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesActor && matchesAction;
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground">Nhật ký hoạt động Admin (Audit Logs)</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Lịch sử ghi chép hoạt động cấu hình hệ thống và tác động dữ liệu</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border p-4 flex gap-4 flex-wrap items-center">
        <label className="space-y-1 block min-w-[200px] flex-1">
          <span className="text-[11px] font-medium text-muted-foreground">Người thực hiện (Actor)</span>
          <DropdownSelect
            value={actorFilter}
            onChange={setActorFilter}
            options={[
              { value: "all", label: "Tất cả người dùng" },
              ...actors.map((actor) => ({ value: actor, label: actor }))
            ]}
            fullWidth
          />
        </label>
        <label className="space-y-1 block min-w-[200px] flex-1">
          <span className="text-[11px] font-medium text-muted-foreground">Loại hành động</span>
          <DropdownSelect
            value={actionFilter}
            onChange={setActionFilter}
            options={[
              { value: "all", label: "Tất cả hành động" },
              ...actions.map((act) => ({ value: act, label: act }))
            ]}
            fullWidth
          />
        </label>
      </div>

      {/* Audit Logs Timeline Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Thời gian</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Người dùng</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Hành động</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Đối tượng</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">IP Address</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Chi tiết thay đổi (Payload)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{timeAgo(log.created_at)}</td>
                  <td className="px-4 py-2.5 font-medium text-card-foreground">{log.actor_id}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px]">
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5 text-card-foreground">
                    <span className="font-mono text-[10px] text-muted-foreground">{log.entity_type}</span>
                    <span className="mx-1.5 text-zinc-300">/</span>
                    <span className="font-semibold">{log.entity_id}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground text-[10px]">{log.ip_address}</td>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground font-mono max-w-[300px] truncate" title={JSON.stringify(log.payload)}>
                    {JSON.stringify(log.payload)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-xs">
            Không tìm thấy nhật ký hoạt động nào.
          </div>
        )}
      </div>
    </div>
  );
}
