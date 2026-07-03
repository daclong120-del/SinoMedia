"use client";

import React, { useState } from "react";
import DropdownSelect from "@/components/dashboard/DropdownSelect";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("g7a8s9d0a1b2c3d4e5f6");
  const [showKey, setShowKey] = useState(false);
  const [balance, setBalance] = useState(4.85);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const [captchaStrategy, setCaptchaStrategy] = useState("auto_solve");
  const [commentDepth, setCommentDepth] = useState("2");
  const [defaultPriority, setDefaultPriority] = useState("normal");

  const handleRefreshBalance = () => {
    setIsLoadingBalance(true);
    setTimeout(() => {
      setBalance(Number((4.5 + Math.random()).toFixed(2)));
      setIsLoadingBalance(false);
    }, 800);
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground">Cài đặt hệ thống</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Cấu hình tham số crawler, tích hợp bên thứ ba và thông báo</p>
      </div>

      {/* Settings Grid */}
      <div className="space-y-6">
        {/* Anti-bot & CAPTCHA */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h3 className="text-xs font-bold text-card-foreground">Anti-bot & CAPTCHA Integration</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tự động vượt slide/image CAPTCHA khi tài khoản crawler gặp checkpoint</p>
          </div>
          <div className="p-4 space-y-4 text-xs">
            {/* 2Captcha API Key */}
            <div className="space-y-1">
              <span className="font-medium text-foreground">2Captcha API Key</span>
              <div className="flex gap-2 max-w-md">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-8 px-3 border border-border rounded-lg bg-background text-foreground font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="h-8 px-3 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                  {showKey ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            {/* 2Captcha Balance */}
            <div className="flex items-center gap-4 py-2 border-y border-border/50">
              <div>
                <p className="text-muted-foreground font-medium">Số dư 2Captcha</p>
                <p className="text-sm font-bold text-foreground font-mono mt-0.5">${balance.toFixed(2)} USD</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshBalance}
                disabled={isLoadingBalance}
                className="h-7 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 text-[11px] font-medium disabled:opacity-50"
              >
                {isLoadingBalance ? "Đang tải..." : "🔄 Cập nhật số dư"}
              </button>
            </div>

            {/* CAPTCHA Strategy */}
            <div className="space-y-1">
              <span className="font-medium text-foreground">Chiến lược xử lý lỗi CAPTCHA</span>
              <DropdownSelect
                value={captchaStrategy}
                onChange={setCaptchaStrategy}
                options={[
                  { value: "auto_solve", label: "Tự động giải CAPTCHA qua 2Captcha API (Khuyên dùng)" },
                  { value: "skip_ban", label: "Bỏ qua và Ban tài khoản ngay lập tức" },
                  { value: "retry_3x_ban", label: "Thử giải 3 lần, thất bại mới ban tài khoản" }
                ]}
                fullWidth
                className="max-w-md"
              />
            </div>
          </div>
        </section>

        {/* Task Queue & Concurrency */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h3 className="text-xs font-bold text-card-foreground">Hàng đợi & Luồng chạy song song</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Giới hạn tài nguyên thực thi của crawler engine</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1 block">
              <span className="font-medium text-foreground">Số task chạy song song tối đa (Concurrency)</span>
              <input type="number" defaultValue={3} className="w-full h-8 px-2 border border-border rounded-lg bg-background text-foreground" />
            </label>
            <label className="space-y-1 block">
              <span className="font-medium text-foreground">Số lần thử lại tối đa (Max Retries)</span>
              <input type="number" defaultValue={2} className="w-full h-8 px-2 border border-border rounded-lg bg-background text-foreground" />
            </label>
            <label className="space-y-1 block">
              <span className="font-medium text-foreground">Độ sâu bình luận mặc định</span>
              <DropdownSelect
                value={commentDepth}
                onChange={setCommentDepth}
                options={[
                  { value: "1", label: "Cấp 1 (Chỉ bình luận gốc)" },
                  { value: "2", label: "Cấp 2 (Bao gồm phản hồi trực tiếp)" },
                  { value: "3", label: "Cấp 3 (Lồng nhau tối đa 3 cấp)" },
                  { value: "5", label: "Cấp 5 (Toàn bộ comment tree)" }
                ]}
                fullWidth
              />
            </label>
            <label className="space-y-1 block">
              <span className="font-medium text-foreground">Mức ưu tiên mặc định</span>
              <DropdownSelect
                value={defaultPriority}
                onChange={setDefaultPriority}
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                  { value: "critical", label: "Critical" },
                  { value: "low", label: "Low" }
                ]}
                fullWidth
              />
            </label>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h3 className="text-xs font-bold text-card-foreground">Thông báo & Webhooks</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Nhận thông báo khi crawler hoàn thành tác vụ</p>
          </div>
          <div className="p-4 space-y-4 text-xs">
            <label className="space-y-1 block">
              <span className="font-medium text-foreground">Default Webhook URL</span>
              <input type="url" placeholder="https://api.telegram.org/bot.../sendMessage hoặc Discord Webhook" className="w-full max-w-xl h-8 px-3 border border-border rounded-lg bg-background text-foreground font-mono focus:outline-none" />
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-card-foreground">
                <input type="checkbox" defaultChecked className="rounded" />
                Gửi thông báo khi tác vụ hoàn thành thành công
              </label>
              <label className="flex items-center gap-2 text-card-foreground">
                <input type="checkbox" defaultChecked className="rounded" />
                Gửi cảnh báo lập tức nếu task cào thất bại (Failed)
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button className="h-8 px-4 text-xs font-medium rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors">
          Hủy
        </button>
        <button className="h-8 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Lưu cài đặt
        </button>
      </div>
    </div>
  );
}
