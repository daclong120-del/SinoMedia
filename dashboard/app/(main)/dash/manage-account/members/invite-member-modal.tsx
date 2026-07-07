"use client";

import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";
import DropdownSelect from "@/components/dashboard/DropdownSelect";
import { inviteMemberAction } from "@/lib/actions/member.actions";
import { RoleItem } from "@/lib/services/member.service";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: RoleItem[];
  showToast: (msg: string, type?: "success" | "info") => void;
}

export function InviteMemberModal({ isOpen, onClose, roles, showToast }: InviteMemberModalProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setLoading(true);
    const res = await inviteMemberAction(inviteEmail, inviteRole);
    setLoading(false);

    if (res.error) {
      showToast(res.error, "info");
    } else {
      showToast(`Đã gửi lời mời tham gia tới ${inviteEmail}`, "success");
      setInviteEmail("");
      setInviteRole("user");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-border select-none">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <UserPlus size={16} className="text-primary" />
            Mời thành viên mới
          </h3>
          <button
            onClick={onClose}
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
              disabled={loading}
              placeholder="VD: member@sinomedia.vn"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Chỉ định Vai trò</label>
            <DropdownSelect
              value={inviteRole}
              onChange={setInviteRole}
              options={roles.map(r => ({ value: r.roleId, label: r.roleName }))}
              fullWidth
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2 select-none">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 rounded-lg border border-border hover:bg-muted text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />}
              Mời thành viên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
