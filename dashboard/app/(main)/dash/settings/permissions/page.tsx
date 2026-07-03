"use client";

import React, { useState } from "react";
import { mockPermissions } from "@/lib/mock-data";

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState(mockPermissions);

  const handleToggle = (key: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.key === key && !p.locked && !p.lockedOff) {
          return { ...p, allowed: !p.allowed };
        }
        return p;
      })
    );
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground">Phân quyền Viewer</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Kiểm soát các trang và tính năng tài khoản Viewer được quyền thấy và tương tác</p>
      </div>

      {/* Info Warning Alert */}
      <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 leading-normal">
        ⚠️ <strong>Nguyên tắc ẩn Sidebar:</strong> Các mục bị tắt quyền truy cập của Viewer sẽ được <strong>ẩn hoàn toàn khỏi Sidebar</strong> của tài khoản Viewer đó, giúp giữ giao diện gọn gàng và bảo mật tuyệt đối.
      </div>

      {/* Permission Matrix */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-muted-foreground font-medium w-1/2">Tính năng / Quyền hạn</th>
                <th className="px-4 py-3 text-muted-foreground font-medium text-center w-32">Vai trò: Viewer</th>
                <th className="px-4 py-3 text-muted-foreground font-medium">Ghi chú hệ thống</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.key} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-card-foreground">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.key}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={p.allowed}
                      disabled={!!p.locked || !!p.lockedOff}
                      onChange={() => handleToggle(p.key)}
                      className="size-4 accent-primary rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {p.locked ? (
                      <span className="text-red-500 font-medium">🔒 Luôn tắt (Chỉ Admin)</span>
                    ) : p.lockedOff ? (
                      <span className="text-red-500 font-medium">🔒 Khóa cứng</span>
                    ) : p.note ? (
                      p.note
                    ) : (
                      "Có thể thay đổi"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save action */}
      <div className="flex justify-end gap-2">
        <button className="h-8 px-4 text-xs font-medium rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors">
          Hủy thay đổi
        </button>
        <button className="h-8 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Lưu phân quyền
        </button>
      </div>
    </div>
  );
}
