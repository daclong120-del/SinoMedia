"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SpiderIcon } from "@/components/icons";
import { useUIStore } from "@/lib/stores/use-ui-store";

// ─── Icon Components (inline SVG cho gọn) ────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("size-3.5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function ChevronIcon({ className, expanded }: { className?: string; expanded?: boolean }) {
  return (
    <svg className={cn("size-3 transition-transform duration-150", expanded ? "rotate-0" : "-rotate-90", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ─── Sidebar Icon Mapping ────────────────────────────────────
const ICON_MAP: Record<string, (p: { className?: string }) => React.ReactNode> = {
  HomeIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  PlayCircleIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  ),
  KeyIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  ServerIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" /><rect width="20" height="8" x="2" y="14" rx="2" ry="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  ),
  UsersIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  FilmIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" /><line x1="7" x2="7" y1="3" y2="21" /><line x1="17" x2="17" y1="3" y2="21" /><line x1="3" x2="21" y1="7" y2="7" /><line x1="3" x2="21" y1="17" y2="17" />
    </svg>
  ),
  CircleStackIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  ClipboardIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><line x1="12" x2="12" y1="11" y2="17" /><line x1="9" x2="15" y1="14" y2="14" />
    </svg>
  ),
  CogIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  ManageAccountIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm0 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
      <path d="M12.475 8l1.86-1.798-1.62-2.804-2.435.697L9.627 1.5h-3.25L5.75 4.095 3.3 3.398 1.68 6.204l1.87 1.807-1.87 1.81 1.62 2.806 2.45-.7.637 2.572h3.25l.643-2.565 2.465.705 1.622-2.805L12.475 8zm-.225 3.453l-2.183-.628-.67.463-.55 2.212h-1.68l-.55-2.2-.647-.475-2.195.628L2.935 10 4.57 8.42v-.81L2.935 6.027l.84-1.455 2.197.63.648-.517.547-2.185h1.68l.55 2.195.645.518 2.208-.64.84 1.454-1.638 1.583.025.808L13.1 10l-.85 1.453z" />
    </svg>
  ),
  ShieldIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  CreditCardIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  MagnifyingGlassIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  ChartBarIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  CalendarIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  UserGroupIcon: ({ className }) => (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};


// ─── Navigation Structure (từ navigation.json) ──────────────
interface NavItem {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  minRole?: string;
  children?: { id: string; label: string; href: string }[];
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard", title: "Dashboard",
    items: [
      { id: "home", label: "Tổng quan", icon: "HomeIcon", href: "/dash/home" },
    ],
  },
  {
    id: "creative-hub", title: "Creative Hub",
    items: [
      { id: "creative-search", label: "Tìm Creative", icon: "MagnifyingGlassIcon", href: "/dash/creative/search" },
      {
        id: "creative-ranking",
        label: "BXH Creative",
        icon: "ChartBarIcon",
        children: [
          { id: "creative-trending", label: "Xu hướng mới nhất", href: "/dash/creative/trending" },
          { id: "creative-growth", label: "Tăng trưởng nhanh", href: "/dash/creative/growth" },
          { id: "creative-new", label: "Creative mới", href: "/dash/creative/new" }
        ]
      },
      { id: "creative-calendar", label: "Lịch tiếp thị", icon: "CalendarIcon", href: "/dash/creative/calendar" },
      { id: "creative-advertisers", label: "Phân tích Advertiser", icon: "UserGroupIcon", href: "/dash/creative/advertisers" },
    ],
  },
  {
    id: "crawler-controller", title: "Crawler Controller",
    items: [
      { id: "tasks", label: "Nhiệm vụ cào", icon: "PlayCircleIcon", href: "/dash/tasks" },
      { id: "accounts", label: "Tài khoản cào", icon: "KeyIcon", href: "/dash/accounts", minRole: "admin" },
      { id: "proxies", label: "Proxy Pool", icon: "ServerIcon", href: "/dash/proxies", minRole: "admin" },
    ],
  },
  {
    id: "data-explorer", title: "Data Explorer",
    items: [
      { id: "authors", label: "Tác giả / KOL", icon: "UsersIcon", href: "/dash/data/authors" },
      { id: "posts", label: "Bài viết & Video", icon: "FilmIcon", href: "/dash/data/posts" },
      { id: "management", label: "Quản lý dữ liệu", icon: "CircleStackIcon", href: "/dash/data/management", minRole: "admin" },
    ],
  },
  {
    id: "admin", title: "Quản trị",
    items: [
      { id: "audit-logs", label: "Nhật ký hoạt động", icon: "ClipboardIcon", href: "/dash/audit-logs", minRole: "admin" },
      { id: "settings-general", label: "Cài đặt hệ thống", icon: "CogIcon", href: "/dash/settings", minRole: "admin" },
      { id: "manage-account-members", label: "Quản lý thành viên", icon: "UsersIcon", href: "/dash/manage-account/members", minRole: "admin" },
    ],
  },
];


// ─── Component ───────────────────────────────────────────────
interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isCollapsed = hasMounted ? sidebarCollapsed : false;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Reset expanded state khi đổi route
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setExpandedGroups({});
  }

  // Ctrl+K focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isActive = (href: string) => {
    if (!href || href === "#") return false;
    if (pathname === href) return true;

    // Danh sách tất cả các route chính đã đăng ký trong Sidebar
    const allRoutes = [
      "/dash/home",
      "/dash/tasks",
      "/dash/accounts",
      "/dash/proxies",
      "/dash/data/authors",
      "/dash/data/posts",
      "/dash/data/management",
      "/dash/creative/search",
      "/dash/creative/trending",
      "/dash/creative/growth",
      "/dash/creative/new",
      "/dash/creative/calendar",
      "/dash/creative/advertisers",
      "/dash/audit-logs",
      "/dash/settings",
      "/dash/manage-account/members",
    ];

    // Nếu pathname trùng khớp chính xác với một route đã đăng ký khác, 
    // không cho phép route ngắn hơn (như /dash/settings) nhận highlight
    const isOtherRouteActive = allRoutes.some((r) => r !== href && pathname === r);
    if (isOtherRouteActive) return false;

    if (href !== "/dash/home" && pathname.startsWith(href + "/")) return true;
    return false;
  };

  const isGroupExpanded = (item: NavItem) => {
    if (expandedGroups[item.id] !== undefined) return expandedGroups[item.id];
    // Mặc định mở nếu có child đang active
    return item.children?.some((c) => isActive(c.href)) ?? false;
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : true,
    }));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div onClick={onMobileClose} className="fixed inset-0 z-45 bg-black/40 lg:hidden" />
      )}

      <aside className={cn(
        "fixed bottom-0 top-0 z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out select-none",
        "lg:sticky lg:top-0 lg:h-screen lg:z-30",
        isCollapsed ? "lg:w-16" : "lg:w-[290px] shrink-0",
        isMobileOpen ? "translate-x-0 w-[290px]" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Brand */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <SpiderIcon className={cn("size-7 text-sinomedia-orange shrink-0")} />
            <span className={cn(
              "text-sm font-bold text-foreground tracking-tight transition-all duration-200",
              isCollapsed && "lg:opacity-0 lg:w-0 lg:hidden"
            )}>
              SinoMedia
            </span>
          </div>
          {/* Mobile close */}
          <button onClick={onMobileClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted lg:hidden text-muted-foreground" aria-label="Đóng menu">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 mb-2 mt-2">
          <div onClick={() => searchInputRef.current?.focus()} className={cn(
            "relative flex items-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors cursor-text",
            isCollapsed ? "lg:justify-center lg:h-9" : "h-9 px-3"
          )}>
            <SearchIcon className="text-muted-foreground shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className={cn(
                "ml-2 w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none",
                isCollapsed && "lg:hidden lg:w-0"
              )}
            />
            <kbd className={cn(
              "hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-sidebar-border bg-sidebar-accent px-1.5 font-mono text-[9px] font-medium text-muted-foreground pointer-events-none shrink-0",
              isCollapsed && "lg:hidden"
            )}>
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Nav Groups */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              {group.title && (
                <h3 className={cn(
                  "px-3 text-[10px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase transition-all duration-200",
                  isCollapsed && "lg:opacity-0 lg:h-0 lg:overflow-hidden"
                )}>
                  {group.title}
                </h3>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const IconComp = item.icon ? ICON_MAP[item.icon] : null;
                  const hasChildren = !!item.children;
                  const expanded = isGroupExpanded(item);
                  const active = !hasChildren && item.href ? isActive(item.href) : false;

                  return (
                    <li key={item.id} className="space-y-0.5">
                      {hasChildren ? (
                        <button
                          onClick={() => !isCollapsed && toggleGroup(item.id)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                            "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                            isCollapsed && "lg:justify-center lg:px-0"
                          )}
                          title={item.label}
                        >
                          {IconComp && <IconComp className={cn("shrink-0 text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100")} />}
                          <span className={cn("flex-1 truncate", isCollapsed && "lg:opacity-0 lg:w-0 lg:hidden")}>{item.label}</span>
                          {!isCollapsed && <ChevronIcon expanded={expanded} className="text-zinc-400 shrink-0" />}
                        </button>
                      ) : (
                        <Link
                          href={item.href || "#"}
                          onClick={onMobileClose}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                            active ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                            isCollapsed && "lg:justify-center lg:px-0"
                          )}
                          title={item.label}
                        >
                          {IconComp && <IconComp className={cn("shrink-0 transition-colors", active ? "text-primary" : "text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100")} />}
                          <span className={cn("truncate", isCollapsed && "lg:opacity-0 lg:w-0 lg:hidden")}>{item.label}</span>
                        </Link>
                      )}

                      {/* Children */}
                      {hasChildren && expanded && !isCollapsed && item.children && (
                        <div className="relative pl-4 ml-[21px] border-l border-border/40 space-y-0.5 mt-1 mb-2">
                          {item.children.map((child) => {
                            const childActive = isActive(child.href);
                            return (
                              <Link
                                key={child.id}
                                href={child.href}
                                onClick={onMobileClose}
                                className={cn(
                                  "flex items-center py-1.5 px-3 rounded-md text-xs transition-colors",
                                  childActive
                                    ? "bg-muted text-foreground font-semibold"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-muted/30 hover:text-zinc-950 dark:hover:text-zinc-50"
                                )}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2 hidden lg:block bg-sidebar">
          <button
            onClick={() => setSidebarCollapsed(!isCollapsed)}
            className="flex h-8 w-full items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-150"
            title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            <svg className={cn("size-4 transition-transform duration-300", isCollapsed && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
