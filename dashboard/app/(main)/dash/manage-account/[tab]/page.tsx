"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount } from "@/lib/account-context";
import {
  Search,
  Plus,
  Users,
  Settings2,
  Lock,
  Shield,
  MoreHorizontal,
  Check,
  Settings,
  ArrowUpDown,
  X,
  Info,
  Globe,
  Sliders,
  FileText,
  Activity,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import DropdownSelect from "@/components/dashboard/DropdownSelect";

interface MemberItem {
  name: string;
  email: string;
  role: string;
  status: "Active" | "Pending";
  isSuperAdmin?: boolean;
}

interface GroupItem {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  createdDate: string;
}

interface BillingItem {
  date: string;
  description: string;
  amount: string;
  status: "Paid" | "Failed";
}

export default function ManageAccountPage() {
  const params = useParams();
  const { activeAccount } = useAccount();
  const currentTab = (params?.tab as string) || "members";

  const activeEmail = activeAccount.includes("@") ? activeAccount : `${activeAccount}@gmail.com`;

  // Invited/custom members state
  const [invitedMembers, setInvitedMembers] = useState<MemberItem[]>([
    { name: "Security Auditor", email: "auditor@cloudflare.com", role: "Read Only Administrator", status: "Active", isSuperAdmin: false },
    { name: "Dev Engineer", email: "engineer@cloudflare.com", role: "Developer", status: "Pending", isSuperAdmin: false }
  ]);

  // Compute total members list (with current active account as Super Admin at index 0)
  const members: MemberItem[] = [
    { name: "Super Admin", email: activeEmail, role: "Super Administrator", status: "Active", isSuperAdmin: true },
    ...invitedMembers
  ];

  // Sub-tabs for Members
  const [memberSubTab, setMemberSubTab] = useState<"all" | "groups" | "settings">("all");

  // Filter/Search states
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Administrator");

  // Groups state
  const [groups, setGroups] = useState<GroupItem[]>([
    { id: "g1", name: "Developers", description: "Read/write access to Cloudflare Workers and static assets", membersCount: 2, createdDate: "2026-03-12" },
    { id: "g2", name: "Security Admins", description: "Full control over WAF rules, DNS, and IP access policies", membersCount: 1, createdDate: "2026-04-18" }
  ]);

  // Create Group Modal State
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  // Settings states
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionDuration, setSessionDuration] = useState("24h");
  const [ssoConfigured, setSsoConfigured] = useState(false);

  // Billing states
  const [billingHistory, setBillingHistory] = useState<BillingItem[]>([
    { date: "2026-06-15", description: "Subscription Plan - Free", amount: "$0.00", status: "Paid" },
    { date: "2026-05-15", description: "Subscription Plan - Free", amount: "$0.00", status: "Paid" },
    { date: "2026-04-15", description: "Subscription Plan - Free", amount: "$0.00", status: "Paid" }
  ]);
  const [isUpgraded, setIsUpgraded] = useState(false);

  // Custom Notifications
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: "success" | "info" }>({
    show: false,
    message: "",
    type: "success"
  });

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Handlers
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    if (members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      showToast("A member with this email already exists.", "info");
      return;
    }

    const newMember: MemberItem = {
      name: inviteRole === "Super Administrator" ? "Super Admin" : "Team Member",
      email: inviteEmail,
      role: inviteRole,
      status: "Pending",
      isSuperAdmin: inviteRole === "Super Administrator"
    };

    setInvitedMembers([...invitedMembers, newMember]);
    setInviteEmail("");
    setIsInviteOpen(false);
    showToast(`Successfully sent invitation to ${inviteEmail}`);
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;

    const newGroup: GroupItem = {
      id: `g-${Date.now()}`,
      name: newGroupName,
      description: newGroupDesc || "No description provided",
      membersCount: 0,
      createdDate: new Date().toISOString().split("T")[0]
    };

    setGroups([...groups, newGroup]);
    setNewGroupName("");
    setNewGroupDesc("");
    setIsCreateGroupOpen(false);
    showToast(`Group "${newGroupName}" has been successfully created`);
  };

  const handleRevokeMember = (email: string) => {
    if (email === activeEmail) {
      showToast("You cannot revoke access for your own active account.", "info");
      return;
    }
    setInvitedMembers(invitedMembers.filter(m => m.email !== email));
    showToast(`Access revoked for ${email}`);
  };

  const handleUpgradePlan = () => {
    setIsUpgraded(true);
    setBillingHistory([
      { date: new Date().toISOString().split("T")[0], description: "Subscription Plan - Pro (Upgraded)", amount: "$20.00", status: "Paid" },
      ...billingHistory
    ]);
    showToast("Successfully upgraded to Pro Plan! Premium features are now active.");
  };

  // Filter members list based on query
  const filteredMembers = members.filter(m => {
    const matchesSearch = m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                          m.role.toLowerCase().includes(memberSearchQuery.toLowerCase());
    const matchesRole = roleFilter === "All roles" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Breadcrumbs helper
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "members": return "Thành viên";
      case "billing": return "Thanh toán";
      case "tokens": return "API Tokens tài khoản";
      case "oauth": return "OAuth clients";
      case "audit": return "Nhật ký hoạt động";
      case "notifications": return "Thông báo";
      case "shared-config": return "Cấu hình chung";
      case "blocked": return "Nội dung bị chặn";
      case "abuse": return "Báo cáo vi phạm";
      case "carbon": return "Báo cáo phát thải";
      case "configurations": return "Cấu hình";
      case "tagged-resources": return "Tài nguyên được gắn thẻ";
      default: return tab.charAt(0).toUpperCase() + tab.slice(1);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 space-y-6 w-full animate-in fade-in duration-200 relative">
      
      {/* Toast Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg bg-card text-foreground animate-in slide-in-from-top-4 duration-300 border-primary/20">
          <div className="h-2 w-2 rounded-full bg-cloudflare-orange animate-ping" />
          <p className="text-xs font-semibold">{notification.message}</p>
          <button onClick={() => setNotification(prev => ({ ...prev, show: false }))} className="ml-2 hover:bg-muted p-0.5 rounded text-muted-foreground font-semibold">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none">
        <Link href="/dash/home" className="hover:text-foreground cursor-pointer transition-colors">
          {activeAccount}
        </Link>
        <span>/</span>
        <span className="text-muted-foreground flex items-center gap-1">
          Quản lý tài khoản <Settings size={12} className="inline text-muted-foreground/60" />
        </span>
        <span>/</span>
        <span className="text-foreground font-semibold">{getTabTitle(currentTab)}</span>
      </div>

      {/* Header */}
      <div className="border-b border-border pb-4 select-none">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {getTabTitle(currentTab)}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {currentTab === "members" && "Quản lý các thành viên của nhóm, chỉ định vai trò tùy chỉnh và thiết lập các quy tắc xác thực."}
          {currentTab === "billing" && "Xem gói đăng ký, lịch sử hóa đơn, phương thức thanh toán và nâng cấp gói dịch vụ."}
          {currentTab === "tokens" && "Tạo khóa truy cập API và token để cho phép các ứng dụng tự động cấu hình hạ tầng."}
          {currentTab === "oauth" && "Đăng ký, định cấu hình và giám sát các ứng dụng OAuth bên ngoài được cấp quyền truy cập."}
          {currentTab === "audit" && "Theo dõi hoạt động của tổ chức với nhật ký đăng nhập, thay đổi quy tắc và thay đổi cấu hình."}
          {currentTab === "notifications" && "Thiết lập quy tắc cảnh báo gửi đến webhook, email khi có thay đổi cấu hình."}
          {currentTab === "shared-config" && "Chia sẻ cấu hình chung, chứng chỉ SSL/TLS hoặc mẫu quy tắc WAF trên các tài khoản phụ."}
          {currentTab === "blocked" && "Quản lý tên miền, dải IP hoặc user agent bị cấm truy cập vào bảng điều khiển."}
          {currentTab === "abuse" && "Gửi báo cáo vi phạm, quản lý khiếu nại đến nội dung được lưu trữ trên nền tảng."}
          {currentTab === "carbon" && "Phân tích tác động carbon và ước lượng lượng phát thải khi sử dụng trung tâm dữ liệu xanh."}
          {currentTab === "configurations" && "Xem lại các tập hợp cấu hình toàn tài khoản và cài đặt mặc định."}
          {currentTab === "tagged-resources" && "Tổ chức tài nguyên bằng cách gắn thẻ để tối ưu hóa quản lý hóa đơn."}
        </p>
      </div>

      {/* RENDER MEMBERS TAB */}
      {currentTab === "members" && (
        <div className="space-y-6">
          {/* Sub-tabs Pills */}
          <div className="flex gap-2 border-b border-border pb-px text-sm font-semibold select-none">
            <button
              onClick={() => setMemberSubTab("all")}
              className={cn(
                "px-4 py-2 border-b-2 -mb-[2px] transition-all cursor-pointer",
                memberSubTab === "all"
                  ? "border-primary text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Tất cả thành viên
            </button>
            <button
              onClick={() => setMemberSubTab("groups")}
              className={cn(
                "px-4 py-2 border-b-2 -mb-[2px] transition-all cursor-pointer",
                memberSubTab === "groups"
                  ? "border-primary text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Nhóm thành viên
            </button>
            <button
              onClick={() => setMemberSubTab("settings")}
              className={cn(
                "px-4 py-2 border-b-2 -mb-[2px] transition-all cursor-pointer",
                memberSubTab === "settings"
                  ? "border-primary text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Cài đặt bảo mật
            </button>
          </div>

          {/* Sub-tab Panels */}
          {memberSubTab === "all" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="flex flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 h-9">
                  <Search size={14} className="text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm theo email..."
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <DropdownSelect
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={[
                      { value: "All roles", label: "Tất cả vai trò" },
                      { value: "Super Administrator", label: "Super Admin" },
                      { value: "Read Only Administrator", label: "Read Only Admin" },
                      { value: "Developer", label: "Developer" },
                      { value: "Administrator", label: "Administrator" }
                    ]}
                  />
                  <button
                    onClick={() => setIsInviteOpen(true)}
                    className="flex h-9 items-center justify-center gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Mời thành viên
                  </button>
                </div>
              </div>

              {/* Members Table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <span className="w-1/3 flex items-center gap-1">Email / Vai trò <ArrowUpDown size={10} /></span>
                  <span className="w-1/12 text-center">Super admin</span>
                  <span className="w-1/12 text-center">Nhóm</span>
                  <span className="w-1/6 text-center">Quyền API</span>
                  <span className="w-1/12 text-center">2FA</span>
                  <span className="w-1/12 text-center">Trạng thái</span>
                  <span className="w-1/12 text-right">Hành động</span>
                </div>

                <div className="divide-y divide-border/60">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-4 text-xs hover:bg-muted/10 transition-colors">
                        <div className="w-1/3 pr-3">
                          <p className="font-semibold text-foreground truncate">{member.email}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                        </div>
                        <div className="w-1/12 flex justify-center text-center">
                          {member.isSuperAdmin ? (
                            <Check size={14} className="text-emerald-500 font-bold" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        <div className="w-1/12 text-center text-muted-foreground">—</div>
                        <div className="w-1/6 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">Mặc định</span>
                        </div>
                        <div className="w-1/12 text-center text-muted-foreground">—</div>
                        <div className="w-1/12 flex justify-center text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
                            member.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", member.status === "Active" ? "bg-emerald-500" : "bg-amber-500")} />
                            {member.status}
                          </span>
                        </div>
                        <div className="w-1/12 text-right flex justify-end">
                          <div className="relative group/action">
                            <button className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                              <MoreHorizontal size={14} />
                            </button>
                            <div className="absolute right-0 top-full mt-1 z-30 hidden group-hover/action:block bg-card border border-border shadow-lg rounded-lg p-1 w-28 text-left animate-in fade-in duration-100">
                              <button
                                onClick={() => showToast(`Chỉnh sửa vai trò cho ${member.email}`)}
                                className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-muted text-foreground cursor-pointer font-medium"
                              >
                                Sửa vai trò
                              </button>
                              <button
                                onClick={() => handleRevokeMember(member.email)}
                                className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-red-500/10 text-red-500 hover:text-red-600 cursor-pointer font-medium"
                              >
                                Thu hồi quyền
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground select-none">
                      Không có thành viên nào khớp với tìm kiếm.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {memberSubTab === "groups" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10 p-4 border border-border rounded-xl">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">Tổ chức thành viên thành các nhóm</p>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Nhóm cho phép bạn quản trị nhiều thành viên cùng lúc và chỉ định quyền truy cập một cách tập trung.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="flex h-9 items-center justify-center gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={14} /> Tạo nhóm mới
                </button>
              </div>

              {/* Groups Table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <span className="w-1/3">Tên nhóm</span>
                  <span className="w-5/12">Mô tả</span>
                  <span className="w-1/12 text-center">Thành viên</span>
                  <span className="w-1/12 text-right">Hành động</span>
                </div>

                <div className="divide-y divide-border/60">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-4 text-xs hover:bg-muted/10 transition-colors">
                      <div className="w-1/3">
                        <p className="font-semibold text-foreground">{group.name}</p>
                        <p className="text-[10px] text-muted-foreground">Tạo vào {group.createdDate}</p>
                      </div>
                      <span className="w-5/12 text-muted-foreground truncate pr-4">{group.description}</span>
                      <div className="w-1/12 text-center font-semibold text-foreground">{group.membersCount}</div>
                      <div className="w-1/12 text-right">
                        <button
                          onClick={() => showToast(`Quản lý cài đặt nhóm "${group.name}"`)}
                          className="text-primary hover:underline font-semibold cursor-pointer text-xs"
                        >
                          Quản lý
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {memberSubTab === "settings" && (
            <div className="max-w-3xl space-y-6">
              {/* 2FA Card */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between select-none">
                  <div className="space-y-1 pr-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Lock size={15} className="text-orange-500" /> Bắt buộc Xác thực 2 yếu tố (2FA)
                    </h3>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Khi bật, tất cả các thành viên trong tổ chức phải thiết lập và xác thực qua 2FA (TOTP hoặc khóa bảo mật) trước khi đăng nhập vào hệ thống quản trị.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setRequire2FA(!require2FA);
                      showToast(`Bắt buộc 2FA đã được chuyển sang ${!require2FA ? "BẬT" : "TẮT"}`);
                    }}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      require2FA ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                        require2FA ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* SSO SAML Card */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between select-none">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Shield size={15} className="text-primary" /> Đăng nhập một lần (SSO / SAML)
                    </h3>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Liên kết với nhà cung cấp danh tính bên thứ ba (ví dụ: Okta, Microsoft Entra, Google Workspace) để quản trị truy cập tập trung.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSsoConfigured(!ssoConfigured);
                      showToast(ssoConfigured ? "Đã ngắt kết nối SSO" : "Đã liên kết thành công nhà cung cấp SAML Okta");
                    }}
                    className={cn(
                      "h-8 px-3 rounded-lg border text-xs font-semibold shadow-sm transition-colors cursor-pointer",
                      ssoConfigured
                        ? "border-red-500/30 text-red-500 hover:bg-red-500/10"
                        : "border-border hover:bg-muted text-foreground"
                    )}
                  >
                    {ssoConfigured ? "Ngắt kết nối SAML" : "Cấu hình SSO"}
                  </button>
                </div>

                {ssoConfigured && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg max-w-md animate-in fade-in duration-200">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Xác thực SAML Đang hoạt động</p>
                      <p className="text-[10px] text-muted-foreground">Nhà cung cấp: Okta SSO | Đang áp dụng quy trình chuyển hướng.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Session Duration Selector */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between select-none">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Settings2 size={15} className="text-muted-foreground" /> Thời gian tối đa của phiên đăng nhập
                    </h3>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Đặt thời gian chờ nhàn rỗi tối đa trước khi tự động đăng xuất người dùng khỏi hệ thống.
                    </p>
                  </div>
                  <DropdownSelect
                    value={sessionDuration}
                    onChange={(val) => {
                      setSessionDuration(val);
                      showToast(`Cập nhật giới hạn phiên đăng nhập thành ${val}`);
                    }}
                    options={[
                      { value: "8h", label: "8 Giờ" },
                      { value: "24h", label: "24 Giờ" },
                      { value: "7d", label: "7 Ngày" },
                      { value: "30d", label: "30 Ngày" }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER BILLING TAB */}
      {currentTab === "billing" && (
        <div className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subscription */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-2 select-none">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all",
                  isUpgraded ? "bg-orange-500/10 text-orange-600" : "bg-primary/10 text-primary"
                )}>
                  {isUpgraded ? "Gói Pro" : "Gói Miễn phí"}
                </span>
                <h3 className="text-sm font-bold text-foreground">Gói dịch vụ hiện tại</h3>
                <p className="text-xs text-muted-foreground leading-normal">
                  {isUpgraded 
                    ? "Bạn đang sử dụng gói SinoMedia Pro. Tận hưởng không giới hạn số luồng cào, phân tích dữ liệu chuyên sâu và lưu trữ tự động trên Cloudflare R2."
                    : "Bạn đang sử dụng gói SinoMedia Free. Giới hạn 3 luồng cào đồng thời, lưu trữ cơ bản Supabase và một tài khoản cào cho mỗi nền tảng."
                  }
                </p>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-between items-center select-none mt-4">
                <span className="text-sm font-bold text-foreground">{isUpgraded ? "$20.00 / tháng" : "$0.00 / tháng"}</span>
                {!isUpgraded ? (
                  <button
                    onClick={handleUpgradePlan}
                    className="h-8 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    Nâng cấp gói
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                    <Check size={14} /> Đang hoạt động
                  </span>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-2 select-none">
                <h3 className="text-sm font-bold text-foreground">Phương thức thanh toán</h3>
                <p className="text-xs text-muted-foreground leading-normal">
                  Hóa đơn đăng ký hàng tháng của bạn sẽ được xử lý qua thẻ mặc định.
                </p>

                <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg max-w-xs mt-2">
                  <div className="flex h-7 w-10 items-center justify-center rounded bg-zinc-950 border border-zinc-800 text-[10px] font-bold text-white tracking-widest uppercase select-none">
                    Visa
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Visa đuôi 4242</p>
                    <p className="text-[10px] text-muted-foreground">Hết hạn 12/2028</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-end select-none mt-4">
                <button
                  onClick={() => showToast("Chức năng thay đổi phương thức thanh toán là giả lập.")}
                  className="h-8 px-3 rounded-lg border border-border hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                >
                  Thay đổi thẻ
                </button>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground select-none">Lịch sử thanh toán</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                <span className="w-1/4">Ngày hóa đơn</span>
                <span className="w-1/3">Mô tả gói</span>
                <span className="w-1/6 text-right">Số tiền</span>
                <span className="w-1/6 text-right">Trạng thái</span>
              </div>
              <div className="divide-y divide-border/60">
                {billingHistory.map((bill, index) => (
                  <div key={index} className="flex items-center justify-between p-4 text-xs hover:bg-muted/10 transition-colors">
                    <span className="w-1/4 text-muted-foreground font-mono">{bill.date}</span>
                    <span className="w-1/3 font-semibold text-foreground">{bill.description}</span>
                    <span className="w-1/6 text-right font-mono text-foreground font-semibold">{bill.amount}</span>
                    <div className="w-1/6 text-right font-semibold">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOCK SUB-TABS RENDER */}
      {currentTab !== "members" && currentTab !== "billing" && (
        <div className="space-y-6 max-w-4xl">
          <div className="border border-border/80 rounded-xl bg-card p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {currentTab === "tokens" && <Lock size={22} />}
              {currentTab === "oauth" && <UserCheck size={22} />}
              {currentTab === "audit" && <FileText size={22} />}
              {currentTab === "notifications" && <Activity size={22} />}
              {currentTab === "shared-config" && <Globe size={22} />}
              {currentTab === "blocked" && <Shield size={22} />}
              {currentTab === "abuse" && <Info size={22} />}
              {currentTab === "carbon" && <Globe size={22} />}
              {currentTab === "configurations" && <Sliders size={22} />}
              {currentTab === "tagged-resources" && <Users size={22} />}
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-base font-bold text-foreground">Tính năng giả lập đang hoạt động</h3>
              <p className="text-xs text-muted-foreground leading-normal">
                Đây là giao diện cấu hình thử nghiệm và mô phỏng. Mọi thay đổi sẽ hiển thị và cập nhật lập tức tại đây.
              </p>
            </div>

            <button
              onClick={() => showToast(`Kích hoạt mô phỏng cho tab: ${getTabTitle(currentTab)}`)}
              className="h-8 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Cấu hình mô phỏng
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border select-none">
              <h3 className="text-sm font-bold text-foreground">Mời thành viên mới</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Địa chỉ Email</label>
                <input
                  type="email"
                  required
                  placeholder="VD: member@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Chỉ định Vai trò</label>
                <DropdownSelect
                  value={inviteRole}
                  onChange={setInviteRole}
                  options={[
                    { value: "Administrator", label: "Administrator" },
                    { value: "Super Administrator", label: "Super Administrator (Đầy đủ quyền)" },
                    { value: "Developer", label: "Developer" },
                    { value: "Read Only Administrator", label: "Read Only Admin" }
                  ]}
                  fullWidth
                />
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Vai trò Administrator cho phép thay đổi cấu hình dự án chỉ định. Vai trò Super Administrator cấp toàn quyền hệ thống.
                </p>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Gửi lời mời
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border select-none">
              <h3 className="text-sm font-bold text-foreground">Tạo nhóm thành viên mới</h3>
              <button
                onClick={() => setIsCreateGroupOpen(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateGroupSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Tên nhóm</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đội kỹ sư phát triển"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Mô tả nhóm</label>
                <textarea
                  placeholder="Chi tiết về chính sách hoặc phân công của nhóm..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Tạo nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
