"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccount } from "@/lib/account-context";
import {
  Search,
  Plus,
  Users,
  Key,
  X,
  Check,
  ArrowUpDown,
  MoreHorizontal,
  UserPlus,
  ShieldCheck,
  Trash2
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

interface ApiTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  role: string;
  createdDate: string;
}

export default function MembersPage() {
  const { activeAccount } = useAccount();
  const [activeTab, setActiveTab] = useState<"members" | "tokens">("members");
  const activeEmail = activeAccount.includes("@") ? activeAccount : `${activeAccount}@gmail.com`;

  // Invited/custom members state
  const [invitedMembers, setInvitedMembers] = useState<MemberItem[]>([
    { name: "Security Auditor", email: "auditor@sinomedia.vn", role: "Read Only Admin", status: "Active", isSuperAdmin: false },
    { name: "Dev Engineer", email: "engineer@sinomedia.vn", role: "Developer", status: "Pending", isSuperAdmin: false }
  ]);

  // Compute total members list (with current active account as Super Admin at index 0)
  const members: MemberItem[] = [
    { name: "Super Admin", email: activeEmail, role: "Super Admin", status: "Active", isSuperAdmin: true },
    ...invitedMembers
  ];

  // API Tokens states
  const [apiTokens, setApiTokens] = useState<ApiTokenItem[]>([
    { id: "t1", name: "SinoMedia Crawler Service", tokenPrefix: "sm_live_a1b2...", role: "Admin", createdDate: "2026-06-20" },
    { id: "t2", name: "Backup exporter utility", tokenPrefix: "sm_live_9z8y...", role: "Read Only Admin", createdDate: "2026-07-01" }
  ]);

  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [activeMenuEmail, setActiveMenuEmail] = useState<string | null>(null);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Admin");
  
  // Edit Role State
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [editingRole, setEditingRole] = useState<string>("Developer");

  // Create API Token Modal State
  const [isCreateTokenOpen, setIsCreateTokenOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenRole, setNewTokenRole] = useState("Admin");

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
      showToast("Thành viên với email này đã tồn tại trong nhóm.", "info");
      return;
    }

    const newMember: MemberItem = {
      name: "Team Member",
      email: inviteEmail,
      role: inviteRole,
      status: "Pending",
      isSuperAdmin: false
    };

    setInvitedMembers([...invitedMembers, newMember]);
    setInviteEmail("");
    setIsInviteOpen(false);
    showToast(`Đã gửi lời mời tham gia tới ${inviteEmail}`);
  };

  const handleRevokeMember = (email: string) => {
    if (email === activeEmail) {
      showToast("Bạn không thể thu hồi quyền của tài khoản admin hiện tại.", "info");
      return;
    }
    setInvitedMembers(invitedMembers.filter(m => m.email !== email));
    showToast(`Đã thu hồi quyền truy cập của ${email}`);
  };

  const handleEditRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setInvitedMembers(
      invitedMembers.map(m =>
        m.email === editingMember.email
          ? { ...m, role: editingRole }
          : m
      )
    );
    showToast(`Đã cập nhật vai trò của ${editingMember.email} thành ${editingRole}`);
    setEditingMember(null);
  };

  const handleCreateTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName) return;

    const randString = Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
    const newToken: ApiTokenItem = {
      id: `t-${Date.now()}`,
      name: newTokenName,
      tokenPrefix: `sm_live_${randString}...`,
      role: newTokenRole,
      createdDate: new Date().toISOString().split("T")[0]
    };

    setApiTokens([...apiTokens, newToken]);
    setNewTokenName("");
    setIsCreateTokenOpen(false);
    showToast(`API Token "${newTokenName}" đã được tạo thành công`);
  };

  const handleRevokeToken = (id: string, name: string) => {
    setApiTokens(apiTokens.filter(t => t.id !== id));
    showToast(`Đã thu hồi API Token "${name}"`);
  };

  // Filter members list based on query
  const filteredMembers = members.filter(m => {
    const matchesSearch = m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                          m.role.toLowerCase().includes(memberSearchQuery.toLowerCase());
    const matchesRole = roleFilter === "All roles" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 space-y-6 w-full animate-in fade-in duration-200 relative">
      
      {/* Toast Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg bg-card text-foreground animate-in slide-in-from-top-4 duration-300 border-primary/20">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
          <p className="text-xs font-semibold">{notification.message}</p>
          <button onClick={() => setNotification(prev => ({ ...prev, show: false }))} className="ml-2 hover:bg-muted p-0.5 rounded text-muted-foreground font-semibold">
            <X size={14} />
          </button>
        </div>
      )}



      {/* Header */}
      <div className="border-b border-border pb-4 select-none">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Quản lý thành viên
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Quản lý phân quyền truy cập của đội ngũ vận hành hệ thống crawler và các khóa cấu hình API.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-border pb-px text-sm font-semibold select-none">
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "px-4 py-2 border-b-2 -mb-[2px] transition-all cursor-pointer flex items-center gap-1.5",
            activeTab === "members"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users size={14} />
          Thành viên hệ thống
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          className={cn(
            "px-4 py-2 border-b-2 -mb-[2px] transition-all cursor-pointer flex items-center gap-1.5",
            activeTab === "tokens"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Key size={14} />
          Khóa truy cập API
        </button>
      </div>

      {/* RENDER MEMBERS TAB */}
      {activeTab === "members" && (
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
                  { value: "Super Admin", label: "Super Admin" },
                  { value: "Admin", label: "Admin" },
                  { value: "Developer", label: "Developer" },
                  { value: "Read Only Admin", label: "Read Only Admin" }
                ]}
              />
              <button
                onClick={() => setIsInviteOpen(true)}
                className="flex h-9 items-center justify-center gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} /> Thêm thành viên
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="p-4 border-b border-border bg-muted/20 rounded-t-xl flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              <span className="w-1/2">Email / Người dùng</span>
              <span className="w-1/4">Vai trò</span>
              <span className="w-1/6 text-center">Trạng thái</span>
              <span className="w-12 text-right"></span>
            </div>

            <div className="divide-y divide-border/60">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-4 text-xs hover:bg-muted/10 transition-colors">
                    <div className="w-1/2 pr-3">
                      <p className="font-semibold text-foreground truncate">{member.email}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{member.name}</p>
                    </div>
                    <div className="w-1/4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium border",
                        member.isSuperAdmin
                          ? "bg-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}>
                        {member.role}
                      </span>
                    </div>
                    <div className="w-1/6 flex justify-center text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                        member.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        <span className={cn("h-1 w-1 rounded-full", member.status === "Active" ? "bg-emerald-500" : "bg-amber-500")} />
                        {member.status}
                      </span>
                    </div>
                    <div className="w-12 text-right flex justify-end">
                      {!member.isSuperAdmin && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuEmail(activeMenuEmail === member.email ? null : member.email)}
                            className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          
                          {activeMenuEmail === member.email && (
                            <>
                              {/* Invisible backdrop to close menu on click outside */}
                              <div
                                className="fixed inset-0 z-20 cursor-default"
                                onClick={() => setActiveMenuEmail(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border shadow-lg rounded-lg p-1 w-32 text-left animate-in fade-in duration-100">
                                <button
                                  onClick={() => {
                                    setActiveMenuEmail(null);
                                    setEditingMember(member);
                                    setEditingRole(member.role);
                                  }}
                                  className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-muted text-foreground cursor-pointer font-medium"
                                >
                                  Sửa vai trò
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuEmail(null);
                                    handleRevokeMember(member.email);
                                  }}
                                  className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-red-500/10 text-red-500 hover:text-red-600 cursor-pointer font-medium flex items-center gap-1"
                                >
                                  <Trash2 size={10} /> Thu hồi quyền
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
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

      {/* RENDER API TOKENS TAB */}
      {activeTab === "tokens" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center select-none">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground">API Access Tokens</h3>
              <p className="text-xs text-muted-foreground">
                Tạo các API tokens để các công cụ bên ngoài hoặc mã nguồn crawler có thể gọi API hợp lệ.
              </p>
            </div>
            <button
              onClick={() => setIsCreateTokenOpen(true)}
              className="flex h-9 items-center justify-center gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <Plus size={14} /> Tạo Token mới
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="divide-y divide-border/60">
              {apiTokens.length > 0 ? (
                apiTokens.map((token) => (
                  <div key={token.id} className="flex items-center justify-between py-3 text-xs first:pt-0 last:pb-0">
                    <div className="space-y-1 min-w-0 mr-4">
                      <p className="font-semibold text-foreground truncate">{token.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{token.tokenPrefix}</span>
                        <span>•</span>
                        <span>Vai trò: {token.role}</span>
                        <span>•</span>
                        <span>Tạo ngày: {token.createdDate}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeToken(token.id, token.name)}
                      className="text-red-500 hover:underline font-semibold cursor-pointer text-xs shrink-0"
                    >
                      Thu hồi
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2 text-center select-none">Chưa có API Token nào được tạo.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border select-none">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <UserPlus size={16} className="text-primary" />
                Mời thành viên mới
              </h3>
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
                  placeholder="VD: member@sinomedia.vn"
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
                    { value: "Admin", label: "Admin" },
                    { value: "Developer", label: "Developer" },
                    { value: "Read Only Admin", label: "Read Only Admin" }
                  ]}
                  fullWidth
                />
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
                  Thêm thành viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border select-none">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-primary" />
                Thay đổi vai trò thành viên
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditRoleSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Địa chỉ Email</label>
                <input
                  type="email"
                  disabled
                  value={editingMember.email}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground focus:outline-none opacity-80"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Chọn Vai trò mới</label>
                <DropdownSelect
                  value={editingRole}
                  onChange={setEditingRole}
                  options={[
                    { value: "Admin", label: "Admin" },
                    { value: "Developer", label: "Developer" },
                    { value: "Read Only Admin", label: "Read Only Admin" }
                  ]}
                  fullWidth
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="h-9 px-4 rounded-lg border border-border hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create API Token Modal */}
      {isCreateTokenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border select-none">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-primary" />
                Tạo API Token mới
              </h3>
              <button
                onClick={() => setIsCreateTokenOpen(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTokenSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Tên gợi nhớ</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Server crawler scraper"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Vai trò của Token</label>
                <DropdownSelect
                  value={newTokenRole}
                  onChange={setNewTokenRole}
                  options={[
                    { value: "Admin", label: "Admin" },
                    { value: "Developer", label: "Developer" },
                    { value: "Read Only Admin", label: "Read Only Admin" }
                  ]}
                  fullWidth
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setIsCreateTokenOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Tạo Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
