"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── Breadcrumb mapping ──────────────────────────────────────
const ROUTE_LABELS: Record<string, string[]> = {
  "/dash/home": ["SinoMedia", "Tổng quan"],
  "/dash/tasks": ["SinoMedia", "Crawler Controller", "Nhiệm vụ cào"],
  "/dash/accounts": ["SinoMedia", "Crawler Controller", "Tài khoản"],
  "/dash/proxies": ["SinoMedia", "Crawler Controller", "Proxy Pool"],
  "/dash/data/authors": ["SinoMedia", "Data Explorer", "Tác giả"],
  "/dash/data/posts": ["SinoMedia", "Data Explorer", "Bài viết"],
  "/dash/data/management": ["SinoMedia", "Data Explorer", "Quản lý dữ liệu"],
  "/dash/audit-logs": ["SinoMedia", "Admin", "Audit Logs"],
  "/dash/settings": ["SinoMedia", "Admin", "Cài đặt"],
  "/dash/settings/permissions": ["SinoMedia", "Admin", "Cài đặt", "Phân quyền"],
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumb = ROUTE_LABELS[pathname] || ["SinoMedia"];
  const [isDark, setIsDark] = useState(false);

  // Đồng bộ dark mode state
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button onClick={onMenuToggle} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted lg:hidden text-muted-foreground" aria-label="Mở menu">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 overflow-hidden">
          {breadcrumb.map((segment, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-border mx-0.5">/</span>}
              <span className={cn(
                "truncate",
                i === breadcrumb.length - 1 ? "text-foreground font-medium" : "hover:text-foreground cursor-default"
              )}>
                {segment}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={isDark ? "Chế độ sáng" : "Chế độ tối"}
        >
          {isDark ? (
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Profile */}
        <div className="flex h-8 items-center gap-2 px-2 rounded-lg text-xs text-muted-foreground hover:bg-muted cursor-default select-none">
          <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
            A
          </div>
          <span className="hidden sm:inline">Admin</span>
        </div>
      </div>
    </header>
  );
}
