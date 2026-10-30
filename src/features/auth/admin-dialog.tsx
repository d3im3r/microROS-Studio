"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, ShieldAlert, ShieldCheck, UserCheck, UserX, X, RefreshCw, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useLanguage } from "../language";
import { authClient } from "./client";

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  createdAt: string | Date;
};

export function AdminPanelDialog({
  isOpen,
  onClose,
  currentUserEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
}) {
  const { translate } = useLanguage();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authClient.admin.listUsers({
        query: {
          limit: 100,
        },
      });
      if (res.data?.users) {
        setUsers(res.data.users as unknown as AdminUserRecord[]);
      } else if (res.error) {
        setError(res.error.message || "Failed to load users");
      }
    } catch {
      setError("Failed to fetch user list from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadUsers();
    }
  }, [isOpen, loadUsers]);

  async function handleApprove(user: AdminUserRecord) {
    setActionUserId(user.id);
    setError("");
    try {
      const res = await authClient.admin.unbanUser({
        userId: user.id,
      });
      if (res.error) {
        setError(res.error.message || "Failed to approve user");
      } else {
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, banned: false, banReason: null } : u))
        );
      }
    } catch {
      setError("Failed to approve user access");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRevoke(user: AdminUserRecord) {
    if (user.email.toLowerCase() === currentUserEmail.toLowerCase()) return;
    setActionUserId(user.id);
    setError("");
    try {
      const res = await authClient.admin.banUser({
        userId: user.id,
        banReason: "Access revoked by admin",
      });
      if (res.error) {
        setError(res.error.message || "Failed to revoke user access");
      } else {
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, banned: true, banReason: "Access revoked by admin" } : u))
        );
      }
    } catch {
      setError("Failed to revoke user access");
    } finally {
      setActionUserId(null);
    }
  }

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    u =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <dialog
      open
      aria-labelledby="admin-panel-title"
      className="fixed inset-0 m-auto max-h-[92vh] w-full max-w-3xl border-0 bg-transparent p-4 text-foreground backdrop:bg-black/80"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === "Escape") onClose();
      }}
    >
      <section className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-secondary dark:text-primary">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 id="admin-panel-title" className="text-base font-semibold">
                {translate("User management")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {translate("Admin panel")} · {currentUserEmail}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={loading}
              onClick={loadUsers}
              title={translate("Refresh")}
              aria-label={translate("Refresh")}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={translate("Close admin panel")}
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
        </header>

        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-muted/40 px-6 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder={translate("Search users...")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background pl-9 pr-3 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {translate("Registered users")}: {users.length}
          </span>
        </div>

        {error && (
          <div role="alert" className="mx-6 mt-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-xs text-destructive">
            {translate(error)}
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          {loading && !users.length ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 animate-spin text-primary" size={20} />
              {translate("Loading...")}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {translate("No users found")}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(u => {
                const isCurrent = u.email.toLowerCase() === currentUserEmail.toLowerCase();
                const isBanned = Boolean(u.banned);
                const isAdmin = u.role === "admin";
                const isBusy = actionUserId === u.id;

                return (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {u.name || "User"}
                        </span>
                        {isAdmin && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-secondary dark:text-primary">
                            {translate("Administrator")}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            You
                          </span>
                        )}
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            <ShieldAlert size={11} />
                            {translate("Pending approval")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            <Check size={11} />
                            {translate("Approved")}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="truncate">{u.email}</span>
                        {u.banReason && (
                          <span className="italic text-muted-foreground">
                            ({u.banReason})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {isBanned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          className="h-8 gap-1.5 border-emerald-600/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                          onClick={() => handleApprove(u)}
                        >
                          <UserCheck size={14} />
                          {translate("Approve access")}
                        </Button>
                      ) : (
                        !isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevoke(u)}
                          >
                            <UserX size={14} />
                            {translate("Revoke access")}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </dialog>
  );
}
