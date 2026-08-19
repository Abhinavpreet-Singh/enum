"use client";
import { apiUrl, API_BASE_URL } from "@/lib/api-config";
import api, { isAxiosError } from "@/lib/api";
import { getMemoryToken } from "@/lib/tokenStore";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Building2, FileText, BarChart3,
  Trash2, CheckCircle, XCircle, Clock,
  Search, AlertTriangle, X, Eye, Construction, Plus, Power,
  Layers, Activity, Code, Target, AlertTriangle as IncidentIcon,
  Ban, RotateCcw, Zap, History,
} from "lucide-react";
import { normalizePagePath } from "@/lib/normalize-page-path";
import Link from "next/link";
import { ADMIN_CONTENT_TYPES } from "@/lib/admin-content-types";
import QuestionsManager from "@/components/admin/questions-manager";
import SimulationsManager, {
  type SimulationListItem,
} from "@/components/admin/simulations-manager";
import EditQuestionModal from "@/components/admin/edit-question-modal";
import EditSimulationModal from "@/components/admin/edit-simulation-modal";
import type { Question } from "@/data/dsa-questions";

// ─── Styles ───────────────────────────────────────────────────────────────────
const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 dark:bg-black/75`;
const labelCls = "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";

const getAdminRequestConfig = () => {
  const token = typeof window !== "undefined" ? getMemoryToken() : null;
  return {
    withCredentials: true as const,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
};

const normalizeApprovalStatus = (status?: string | null) => {
  const value = (status || "pending").trim().toLowerCase();
  if (value === "approved" || value === "rejected" || value === "pending") return value;
  return "pending";
};

const actionButtonCls =
  "inline-flex items-center justify-center px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeApprovalStatus(status);
  const colors: Record<string, string> = {
    approved: "text-emerald-600 dark:text-emerald-400 border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/20",
    pending:  "text-amber-600 dark:text-amber-400 border-amber-400/40 bg-amber-50 dark:bg-amber-950/20",
    rejected: "text-red-600 dark:text-red-400 border-red-400/40 bg-red-50 dark:bg-red-950/20",
  };
  const icons: Record<string, typeof CheckCircle> = { approved: CheckCircle, pending: Clock, rejected: XCircle };
  const Icon = icons[normalized] ?? Clock;
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${colors[normalized] ?? colors.pending}`}>
      <Icon className="w-2.5 h-2.5" />{normalized}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  accent?: string;
  href?: string;
}) {
  const content = (
    <div className={`${panelSurface} p-5 flex items-center gap-4 ${href ? "transition-colors hover:bg-black/2 dark:hover:bg-white/3 cursor-pointer" : ""}`}>
      <div className={`w-10 h-10 flex items-center justify-center border ${panelBorder} shrink-0 ${accent ?? ""}`}>
        <Icon className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase">{label}</p>
        <p className="font-mono text-2xl font-bold text-black dark:text-white leading-tight">{value}</p>
        {href && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Click to add
          </p>
        )}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
export function OverviewTab() {
  // const [stats, setStats] = useState<Record<string, number> & { recentUsers?: unknown[]; recentCompanies?: unknown[] } | null>(null);
  const [stats, setStats] = useState<{
    [key: string]: any;
    recentUsers?: unknown[];
    recentCompanies?: unknown[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const handleOverviewApproval = async (id: string, status: string) => {
    try {
      await api.patch(
        `/api/v1/admin/organizations/${id}/approval`,
        { status },
        getAdminRequestConfig(),
      );
      setStats((prev) => {
        if (!prev) return prev;
        const recentCompanies = ((prev.recentCompanies || []) as { id: string; name: string; email: string; approvalStatus: string; createdAt: string }[]).map((c) =>
          c.id === id ? { ...c, approvalStatus: status } : c,
        );
        const pendingDelta = status === "approved" || status === "rejected" ? -1 : 0;
        return {
          ...prev,
          recentCompanies,
          pendingCompanies: Math.max(0, (prev.pendingCompanies || 0) + pendingDelta),
        };
      });
    } catch {
      // ignore — user can retry from Companies tab
    }
  };

  useEffect(() => {
    api.get("/api/v1/admin/stats", getAdminRequestConfig())
      .then(r => setStats(r.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className={`${panelSurface} p-5 h-20 animate-pulse`} />)}</div>;
  if (!stats) return <p className="font-mono text-xs text-gray-400">Failed to load stats.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Users"      value={stats.totalUsers}      icon={Users} />
        <StatCard label="Companies"        value={stats.totalCompanies}  icon={Building2} />
        <StatCard label="Assessments"      value={stats.totalAssessments} icon={FileText} />
        <StatCard label="Attempts"         value={stats.totalAttempts}   icon={BarChart3} />
        <StatCard label="Question Banks"   value={stats.totalQuestionBanks} icon={FileText} />
        <StatCard label="Pending Companies" value={stats.pendingCompanies} icon={Clock} accent="bg-amber-50 dark:bg-amber-950/20" />
        <StatCard label="Simulations"      value={stats.totalSimulations ?? 0} icon={Code} />
        <StatCard label="Incidents"        value={stats.totalIncidents ?? 0} icon={IncidentIcon} />
        <StatCard label="DSA Questions"    value={stats.totalDsaQuestions ?? 0} icon={Target} />
        <StatCard label="Incident Sessions" value={stats.totalIncidentSessions ?? 0} icon={Activity} />
        <StatCard label="Maintenance Live" value={stats.activeMaintenancePages ?? 0} icon={Construction} accent="bg-amber-50 dark:bg-amber-950/20" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent users */}
        <div className={`${panelSurface} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Recent Users</p>
          </div>
          {((stats.recentUsers || []) as { id: string; username: string; email: string; createdAt: string; accountRole?: string }[]).map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-2.5 border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/1 dark:hover:bg-white/1">
              <div>
                <p className="font-mono text-xs font-semibold text-black dark:text-white">{u.username}</p>
                <p className="font-mono text-[10px] text-gray-400">{u.email}</p>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400 border border-black/10 dark:border-white/10 px-2 py-0.5">{u.accountRole || "user"}</span>
            </div>
          ))}
        </div>

        {/* Recent companies */}
        <div className={`${panelSurface} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Recent Companies</p>
          </div>
          {((stats.recentCompanies || []) as { id: string; name: string; email: string; approvalStatus: string; createdAt: string }[]).map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/1 dark:hover:bg-white/1">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-black dark:text-white">{c.name}</p>
                <p className="font-mono text-[10px] text-gray-400 truncate">{c.email}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge status={c.approvalStatus} />
                {normalizeApprovalStatus(c.approvalStatus) === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleOverviewApproval(c.id, "approved")}
                      className={`${actionButtonCls} border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleOverviewApproval(c.id, "rejected")}
                      className={`${actionButtonCls} border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30`}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
type UserRow = {
  id: string; username: string; email: string; fullName: string;
  accountRole: string; isVerified: boolean; createdAt: string;
  _count: { candidateAttempts: number; incidentSessions: number };
};
type XpAward = { id: string; awardKey: string; xpAmount: number; createdAt: string };
type ActivityLog = { id: string; activityType: string; resourceTitle: string; outcome: string; xpEarned: number; score: number | null; createdAt: string };

export function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Record<string, unknown> | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [suspendConfirm, setSuspendConfirm] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"profile" | "activity" | "xp">("profile");
  const [userActivity, setUserActivity] = useState<{ logs: ActivityLog[]; xpAwards: XpAward[] } | null>(null);

  const fetchList = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "15" };
    if (search) params.search = search;
    api.get("/api/v1/admin/users", { ...getAdminRequestConfig(), params })
      .then(r => { setUsers(r.data.data); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { const t = setTimeout(fetchList, 0); return () => clearTimeout(t); }, [fetchList]);

  const openDetail = async (u: UserRow) => {
    setSelected(u); setDrawerTab("profile"); setUserActivity(null);
    const r = await api.get(`/api/v1/admin/users/${u.id}`, getAdminRequestConfig());
    setSelectedDetail(r.data.data);
  };

  const loadActivity = async (id: string) => {
    if (userActivity) return;
    try {
      const r = await api.get(`/api/v1/admin/users/${id}/activity`, getAdminRequestConfig());
      setUserActivity(r.data.data);
    } catch { setUserActivity({ logs: [], xpAwards: [] }); }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/v1/admin/users/${id}`, getAdminRequestConfig());
    setDelConfirm(null); setSelected(null); setSelectedDetail(null); fetchList();
  };

  const handleSuspend = async (id: string) => {
    const u = users.find((u) => u.id === id);
    const isSuspended = u?.accountRole?.startsWith("__suspended__");
    await api.patch(`/api/v1/admin/users/${id}/suspend`, {
      suspended: !isSuspended,
      reason: isSuspended ? "" : "Admin action",
    }, getAdminRequestConfig());
    setSuspendConfirm(null); setSelected(null); setSelectedDetail(null); fetchList();
  };

  const totalPages = Math.ceil(total / 15);

  const isSuspended = (u: UserRow) => u.accountRole?.startsWith("__suspended__");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 ${panelBorder} flex-1 max-w-xs`}>
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." className="bg-transparent font-mono text-xs outline-none flex-1 text-black dark:text-white placeholder:text-gray-400" />
        </div>
        <span className="font-mono text-[10px] text-gray-400">{total} total</span>
      </div>

      <div className={`${panelSurface} overflow-hidden`}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 border-b border-black/5 dark:border-white/5 animate-pulse" />)
        ) : users.length === 0 ? (
          <div className="p-12 text-center"><p className="font-mono text-xs text-gray-400">No users found.</p></div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                {["Username", "Email", "Role", "Verified", "Attempts", "Joined", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={`border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/1.5 dark:hover:bg-white/1.5 transition-colors ${isSuspended(u) ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-semibold text-black dark:text-white">{u.username}</p>
                    {isSuspended(u) && <span className="font-mono text-[8px] uppercase text-red-500 tracking-wider">suspended</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className="font-mono text-[9px] uppercase border border-black/10 dark:border-white/10 px-2 py-0.5 text-gray-500">{isSuspended(u) ? "suspended" : u.accountRole}</span></td>
                  <td className="px-4 py-3">{u.isVerified ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{u._count.candidateAttempts}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetail(u)} className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setSuspendConfirm(u.id)} className={`p-1 transition-colors ${isSuspended(u) ? "text-amber-500 hover:text-emerald-500" : "text-gray-400 hover:text-amber-500"}`} title={isSuspended(u) ? "Unsuspend" : "Suspend"}>
                        {isSuspended(u) ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setDelConfirm(u.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-40`}>← Prev</button>
          <span className="font-mono text-[10px] text-gray-400">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-40`}>Next →</button>
        </div>
      )}

      {/* User detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 dark:bg-black/60">
          <div className="w-full max-w-lg h-full bg-white dark:bg-black border-l border-black/20 dark:border-white/25 flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
              <div>
                <h2 className="font-mono text-xs font-bold text-black dark:text-white uppercase">User Detail</h2>
                <p className="font-mono text-[10px] text-gray-400 mt-0.5">@{selected.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSuspendConfirm(selected.id)} className={`p-1.5 transition-colors ${isSuspended(selected) ? "text-amber-500" : "text-gray-400 hover:text-amber-500"}`} title={isSuspended(selected) ? "Unsuspend" : "Suspend"}>
                  {isSuspended(selected) ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </button>
                <button onClick={() => setDelConfirm(selected.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => { setSelected(null); setSelectedDetail(null); setUserActivity(null); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
            </div>

            {/* Drawer sub-tabs */}
            <div className="flex border-b border-black/10 dark:border-white/10 shrink-0">
              {(["profile", "activity", "xp"] as const).map((t) => (
                <button key={t} onClick={() => {
                  setDrawerTab(t);
                  if (t !== "profile") loadActivity(selected.id);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[10px] uppercase tracking-wider border-b-2 transition-colors -mb-px ${drawerTab === t ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-400 hover:text-black dark:hover:text-white"}`}>
                  {t === "activity" && <History className="w-3 h-3" />}
                  {t === "xp" && <Zap className="w-3 h-3" />}
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {drawerTab === "profile" && (
                !selectedDetail ? (
                  <div className="animate-pulse space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 bg-black/5 dark:bg-white/5" />)}</div>
                ) : (
                  <>
                    <DetailSection title="Account">
                      <DetailRow label="User ID"   value={String(selectedDetail.id)} mono />
                      <DetailRow label="Username"  value={String(selectedDetail.username)} />
                      <DetailRow label="Email"     value={String(selectedDetail.email)} />
                      <DetailRow label="Full Name" value={String(selectedDetail.fullName || "—")} />
                      <DetailRow label="Role"      value={isSuspended(selected) ? "Suspended" : String(selectedDetail.accountRole)} />
                      <DetailRow label="Verified"  value={selectedDetail.isVerified ? "Yes" : "No"} />
                      <DetailRow label="GitHub"    value={selectedDetail.githubId ? "Connected" : "—"} />
                      <DetailRow label="Google"    value={selectedDetail.googleId ? "Connected" : "—"} />
                      <DetailRow label="Joined"    value={new Date(String(selectedDetail.createdAt)).toLocaleString()} />
                    </DetailSection>
                    {selectedDetail.bio && (
                      <DetailSection title="Bio">
                        <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{String(selectedDetail.bio)}</p>
                      </DetailSection>
                    )}
                    <DetailSection title="Activity">
                      <DetailRow label="Assessment Attempts" value={String((selectedDetail._count as { candidateAttempts: number }).candidateAttempts)} />
                      <DetailRow label="Incident Sessions"   value={String((selectedDetail._count as { incidentSessions: number }).incidentSessions)} />
                    </DetailSection>
                    {((selectedDetail.candidateAttempts as unknown[]) || []).length > 0 && (
                      <DetailSection title="Recent Attempts">
                        {(selectedDetail.candidateAttempts as { id: string; score: number; status: string; createdAt: string }[]).slice(0, 5).map(a => (
                          <div key={a.id} className="flex justify-between items-center py-1 border-b border-black/5 dark:border-white/5 last:border-b-0">
                            <span className="font-mono text-[10px] text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                            <span className="font-mono text-[10px] text-gray-400">{a.status}</span>
                            <span className="font-mono text-[10px] font-bold text-black dark:text-white">{a.score ?? "—"} pts</span>
                          </div>
                        ))}
                      </DetailSection>
                    )}
                  </>
                )
              )}

              {drawerTab === "activity" && (
                !userActivity ? (
                  <div className="animate-pulse space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-black/5 dark:bg-white/5" />)}</div>
                ) : userActivity.logs.length === 0 ? (
                  <p className="font-mono text-xs text-gray-400">No activity logged for this user.</p>
                ) : (
                  <DetailSection title={`Activity Log (${userActivity.logs.length})`}>
                    {userActivity.logs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between gap-2 px-3 py-2 border-b border-black/5 dark:border-white/5 last:border-b-0">
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] text-black dark:text-white font-semibold truncate">{log.resourceTitle || log.activityType}</p>
                          <p className="font-mono text-[9px] text-gray-400 capitalize">{log.activityType} · {log.outcome}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-[10px] font-bold text-black dark:text-white">+{log.xpEarned} XP</p>
                          <p className="font-mono text-[9px] text-gray-400">{new Date(log.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </DetailSection>
                )
              )}

              {drawerTab === "xp" && (
                !userActivity ? (
                  <div className="animate-pulse space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-black/5 dark:bg-white/5" />)}</div>
                ) : userActivity.xpAwards.length === 0 ? (
                  <p className="font-mono text-xs text-gray-400">No XP awards recorded.</p>
                ) : (
                  <>
                    <div className={`${panelSurface} px-4 py-3 flex items-center gap-3`}>
                      <Zap className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Total XP</p>
                        <p className="font-mono text-xl font-bold text-black dark:text-white">
                          {userActivity.xpAwards.reduce((sum, a) => sum + a.xpAmount, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <DetailSection title={`XP Ledger (${userActivity.xpAwards.length} awards)`}>
                      {userActivity.xpAwards.map((award) => (
                        <div key={award.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-black/5 dark:border-white/5 last:border-b-0">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] text-black dark:text-white truncate">{award.awardKey}</p>
                            <p className="font-mono text-[9px] text-gray-400">{new Date(award.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">+{award.xpAmount}</span>
                        </div>
                      ))}
                    </DetailSection>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {delConfirm && <ConfirmDelete onCancel={() => setDelConfirm(null)} onConfirm={() => handleDelete(delConfirm)} label="Delete this user and all their data?" />}
      {suspendConfirm && (
        <ConfirmDelete
          onCancel={() => setSuspendConfirm(null)}
          onConfirm={() => handleSuspend(suspendConfirm)}
          label={isSuspended(users.find((u) => u.id === suspendConfirm)!) ? "Unsuspend this user?" : "Suspend this user? They will not be able to log in."}
        />
      )}
    </div>
  );
}

// ─── Companies tab ────────────────────────────────────────────────────────────
type CompanyAssessmentSummary = {
  id: string;
  title: string;
  status: string;
  testCode: string;
  _count: { attempts: number };
};

type CompanyDetail = {
  id: string;
  name: string;
  email: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  approvalStatus: string;
  createdAt: string;
  contactName?: string;
  contactEmail?: string;
  description?: string;
  _count: { assessments: number; questionBanks: number };
  assessments?: CompanyAssessmentSummary[];
};

export function CompaniesTab() {
  const [companies, setCompanies] = useState<{
    id: string; name: string; email: string; website: string; industry: string;
    size: string; location: string; approvalStatus: string; createdAt: string;
    _count: { assessments: number; questionBanks: number };
  }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CompanyDetail | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const getOrganizations = (params?: Record<string, string>) => {
    const config = { ...getAdminRequestConfig(), params };
    return api.get("/api/v1/admin/organizations", config)
      .catch(() => api.get("/api/v1/admin/companies", config));
  };

  const getOrganizationById = (id: string) => {
    const config = getAdminRequestConfig();
    return api.get(`/api/v1/admin/organizations/${id}`, config)
      .catch(() => api.get(`/api/v1/admin/companies/${id}`, config));
  };

  const patchOrganizationApproval = async (id: string, status: string) => {
    const config = getAdminRequestConfig();
    try {
      return await api.patch(`/api/v1/admin/organizations/${id}/approval`, { status }, config);
    } catch (firstError) {
      try {
        return await api.patch(`/api/v1/admin/companies/${id}/approval`, { status }, config);
      } catch {
        throw firstError;
      }
    }
  };

  const deleteOrganizationById = (id: string) => {
    const config = getAdminRequestConfig();
    return api.delete(`/api/v1/admin/organizations/${id}`, config)
      .catch(() => api.delete(`/api/v1/admin/companies/${id}`, config));
  };

  const fetch = useCallback((options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError("");
    const params: Record<string, string> = { page: String(page), limit: "15" };
    if (search) params.search = search;
    if (statusFilter !== "all") params.status = statusFilter;
    getOrganizations(params)
      .then((r) => {
        setCompanies(
          (r.data.data || []).map((company: { approvalStatus?: string }) => ({
            ...company,
            approvalStatus: normalizeApprovalStatus(company.approvalStatus),
          })),
        );
        setTotal(r.data.total);
      })
      .catch(() => {
        if (!options?.silent) {
          setCompanies([]);
          setTotal(0);
        }
        setError("Failed to load companies. Please refresh or check admin login.");
      })
      .finally(() => {
        if (!options?.silent) setLoading(false);
      });
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetch]);

  const openDetail = async (c: typeof companies[0]) => {
    setError("");
    const r = await getOrganizationById(c.id);
    setSelected(r.data.data as CompanyDetail);
  };

  const handleApproval = async (id: string, status: string) => {
    setApprovingId(id);
    setError("");
    try {
      await patchOrganizationApproval(id, status);
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, approvalStatus: status } : c)),
      );
      if (selected?.id === id) {
        setSelected({ ...selected, approvalStatus: status });
      }
      fetch({ silent: true });
    } catch (err) {
      const message = isAxiosError(err)
        ? err.response?.data?.message || "Failed to update approval status."
        : "Failed to update approval status.";
      setError(message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    await deleteOrganizationById(id);
    setDelConfirm(null); setSelected(null); fetch();
  };

  const totalPages = Math.ceil(total / 15);
  const pendingCompanies = companies.filter(
    (c) => normalizeApprovalStatus(c.approvalStatus) === "pending",
  );

  return (
    <div className="space-y-4">
      {pendingCompanies.length > 0 && (
        <div className={`${panelSurface} p-4 space-y-3`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="font-mono text-xs font-semibold text-black dark:text-white">
              Pending organization approvals ({pendingCompanies.length})
            </p>
          </div>
          <div className="space-y-2">
            {pendingCompanies.map((company) => (
              <div
                key={`pending-${company.id}`}
                className="flex flex-wrap items-center justify-between gap-3 border border-amber-400/30 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-black dark:text-white">{company.name}</p>
                  <p className="font-mono text-[10px] text-gray-500 truncate">{company.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={approvingId === company.id}
                    onClick={() => void handleApproval(company.id, "approved")}
                    className={`${actionButtonCls} border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    {approvingId === company.id ? "Saving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={approvingId === company.id}
                    onClick={() => void handleApproval(company.id, "rejected")}
                    className={`${actionButtonCls} border-red-500/50 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50`}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`flex items-center gap-2 px-3 py-1.5 ${panelBorder} flex-1 max-w-xs`}>
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search companies..." className="bg-transparent font-mono text-xs outline-none flex-1 text-black dark:text-white placeholder:text-gray-400" />
        </div>
        {["all", "pending", "approved", "rejected"].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 font-mono text-[10px] tracking-wider border transition-colors ${statusFilter === s ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" : "text-gray-500 border-gray-300 dark:border-neutral-700 hover:border-gray-500"}`}>
            {s.toUpperCase()}
          </button>
        ))}
        <span className="font-mono text-[10px] text-gray-400 ml-auto">{total} total</span>
      </div>

      <div className={`${panelSurface}`}>
        {error && (
          <div className="px-4 py-2 border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
            <p className="font-mono text-[10px] text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 border-b border-black/5 dark:border-white/5 animate-pulse" />)
        ) : companies.length === 0 ? (
          <div className="p-12 text-center"><p className="font-mono text-xs text-gray-400">No companies found.</p></div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                {["Company", "Email", "Industry", "Status", "Assessments", "Joined", "Actions"].map(h => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map(c => {
                const status = normalizeApprovalStatus(c.approvalStatus);
                const isApproving = approvingId === c.id;
                return (
                <tr key={c.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/1.5 dark:hover:bg-white/1.5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-black dark:text-white">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.email}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{c.industry || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={status} /></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{c._count.assessments}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="relative px-4 py-3 z-10">
                    <div className="flex items-center gap-2 flex-wrap">
                      {status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={(e) => { e.stopPropagation(); void handleApproval(c.id, "approved"); }}
                            className={`${actionButtonCls} border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30`}
                          >
                            {isApproving ? "Saving..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={(e) => { e.stopPropagation(); void handleApproval(c.id, "rejected"); }}
                            className={`${actionButtonCls} border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30`}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {status === "rejected" && (
                        <button
                          type="button"
                          disabled={isApproving}
                          onClick={(e) => { e.stopPropagation(); void handleApproval(c.id, "approved"); }}
                          className={`${actionButtonCls} border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30`}
                        >
                          {isApproving ? "Saving..." : "Approve"}
                        </button>
                      )}
                      {status === "approved" && (
                        <button
                          type="button"
                          disabled={isApproving}
                          onClick={(e) => { e.stopPropagation(); void handleApproval(c.id, "rejected"); }}
                          className={`${actionButtonCls} border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30`}
                        >
                          Reject
                        </button>
                      )}
                      <button type="button" onClick={() => void openDetail(c)} className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="View details"><Eye className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => setDelConfirm(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-40`}>← Prev</button>
          <span className="font-mono text-[10px] text-gray-400">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-40`}>Next →</button>
        </div>
      )}

      {/* Company detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 dark:bg-black/60"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg h-full bg-white dark:bg-black border-l border-black/20 dark:border-white/25 flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
              <div>
                <h2 className="font-mono text-xs font-bold text-black dark:text-white uppercase">Company Detail</h2>
                <p className="font-mono text-[10px] text-gray-400 mt-0.5">{String(selected.name)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setDelConfirm(String(selected.id))} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Approval actions */}
              <div>
                <label className={labelCls}>Approval</label>
                <div className={`${panelSurface} p-4 space-y-3`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">Current status</span>
                    <StatusBadge status={selected.approvalStatus} />
                  </div>
                  <div className="flex gap-2">
                    {normalizeApprovalStatus(selected.approvalStatus) !== "approved" && (
                      <button
                        type="button"
                        disabled={approvingId === selected.id}
                        onClick={() => void handleApproval(String(selected.id), "approved")}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-wider border border-emerald-400/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {approvingId === selected.id ? "Saving..." : "Approve organization"}
                      </button>
                    )}
                    {normalizeApprovalStatus(selected.approvalStatus) !== "rejected" && (
                      <button
                        type="button"
                        disabled={approvingId === selected.id}
                        onClick={() => void handleApproval(String(selected.id), "rejected")}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-wider border border-red-400/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject organization
                      </button>
                    )}
                  </div>
                  {normalizeApprovalStatus(selected.approvalStatus) === "pending" && (
                    <p className="font-mono text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
                      This organization registered and is waiting for your approval before they can access their dashboard.
                    </p>
                  )}
                </div>
              </div>
              <DetailSection title="Company Info">
                <DetailRow label="Company ID"    value={String(selected.id)} mono />
                <DetailRow label="Name"          value={String(selected.name)} />
                <DetailRow label="Email"         value={String(selected.email)} />
                <DetailRow label="Website"       value={String(selected.website || "—")} />
                <DetailRow label="Industry"      value={String(selected.industry || "—")} />
                <DetailRow label="Size"          value={String(selected.size || "—")} />
                <DetailRow label="Location"      value={String(selected.location || "—")} />
                <DetailRow label="Contact Name"  value={String(selected.contactName || "—")} />
                <DetailRow label="Contact Email" value={String(selected.contactEmail || "—")} />
                <DetailRow label="Registered"    value={new Date(String(selected.createdAt)).toLocaleString()} />
              </DetailSection>
              {selected.description && (
                <DetailSection title="Description">
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{String(selected.description)}</p>
                </DetailSection>
              )}
              <DetailSection title="Activity">
                <DetailRow label="Assessments"    value={String(selected._count.assessments)} />
                <DetailRow label="Question Banks" value={String(selected._count.questionBanks)} />
              </DetailSection>
              {(selected.assessments || []).length > 0 && (
                <DetailSection title="Recent Assessments">
                  {(selected.assessments || []).slice(0, 5).map(a => (
                    <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-black/5 dark:border-white/5 last:border-b-0">
                      <div>
                        <p className="font-mono text-xs text-black dark:text-white">{a.title}</p>
                        <p className="font-mono text-[9px] text-gray-400">Code: {a.testCode}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={a.status} />
                        <p className="font-mono text-[9px] text-gray-400 mt-0.5">{a._count.attempts} attempts</p>
                      </div>
                    </div>
                  ))}
                </DetailSection>
              )}
            </div>
          </div>
        </div>
      )}

      {delConfirm && <ConfirmDelete onCancel={() => setDelConfirm(null)} onConfirm={() => handleDelete(delConfirm)} label="Delete this company and all its data permanently?" />}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={labelCls}>{title}</p>
      <div className={`${panelSurface} overflow-hidden`}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between px-3 py-2 border-b border-black/5 dark:border-white/5 last:border-b-0 gap-4">
      <span className="font-mono text-[10px] text-gray-400 shrink-0 uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-[10px] text-black dark:text-white text-right break-all ${mono ? "opacity-60" : ""}`}>{value}</span>
    </div>
  );
}

function ConfirmDelete({ onCancel, onConfirm, label }: { onCancel: () => void; onConfirm: () => void; label: string }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className={`${panelSurface} p-6 w-full max-w-sm mx-4 bg-white dark:bg-black shadow-2xl`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <h3 className="font-mono text-xs font-bold text-black dark:text-white uppercase">Confirm Delete</h3>
        </div>
        <p className="font-mono text-xs text-gray-500 mb-5">{label} This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className={`px-4 py-2 font-mono text-xs border border-black/20 dark:border-white/25 text-gray-500 hover:border-black dark:hover:border-white transition-colors`}>Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 font-mono text-xs bg-red-600 text-white hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Content tab ──────────────────────────────────────────────────────────────
type ContentCounts = {
  simulations: number;
  incidents: number;
  dsaQuestions: number;
  linuxQuestions: number;
  systemDesign: number;
  publishedAssessments: number;
  draftAssessments: number;
  archivedAssessments: number;
  incidentSessions: number;
  simulationProgress: number;
  submissions: number;
  violations: number;
};

export function ContentTab() {
  const [data, setData] = useState<{
    counts: ContentCounts;
    recentSimulations: { id: string; title: string; category: string; difficulty: string; updatedAt: string }[];
    recentIncidents: { id: string; title: string; difficulty: string; category: string; updatedAt: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSimulation, setEditingSimulation] = useState<SimulationListItem | null>(null);
  const [inventoryKey, setInventoryKey] = useState(0);

  const refreshStats = useCallback(() => {
    api
      .get("/api/v1/admin/content-stats", getAdminRequestConfig())
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const handleInventoryChanged = () => {
    setInventoryKey((key) => key + 1);
    refreshStats();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`${panelSurface} p-5 h-20 animate-pulse`} />
        ))}
      </div>
    );
  }

  if (!data) {
    return <p className="font-mono text-xs text-gray-400">Failed to load content stats.</p>;
  }

  const { counts } = data;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Learning content
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Browser Simulations" value={counts.simulations} icon={Code} href={ADMIN_CONTENT_TYPES.simulations.href} />
          <StatCard label="Incident Scenarios" value={counts.incidents} icon={IncidentIcon} href={ADMIN_CONTENT_TYPES.incidents.href} />
          <StatCard label="DSA Questions" value={counts.dsaQuestions} icon={Target} href={ADMIN_CONTENT_TYPES.dsa.href} />
          <StatCard label="Linux Challenges" value={counts.linuxQuestions} icon={Code} href={ADMIN_CONTENT_TYPES.linux.href} />
          <StatCard label="System Design" value={counts.systemDesign} icon={Layers} href={ADMIN_CONTENT_TYPES["system-design"].href} />
          <StatCard label="Code Submissions" value={counts.submissions} icon={FileText} />
          <StatCard label="Sim Progress Rows" value={counts.simulationProgress} icon={BarChart3} />
          <StatCard label="Incident Sessions" value={counts.incidentSessions} icon={Activity} />
        </div>
      </div>

      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Hiring assessments
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Published Tests" value={counts.publishedAssessments} icon={CheckCircle} accent="bg-emerald-50 dark:bg-emerald-950/20" />
          <StatCard label="Draft Tests" value={counts.draftAssessments} icon={Clock} />
          <StatCard label="Archived Tests" value={counts.archivedAssessments} icon={FileText} />
          <StatCard label="Proctor Violations" value={counts.violations} icon={AlertTriangle} accent="bg-red-50 dark:bg-red-950/20" />
        </div>
      </div>

      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Manage questions
        </p>
        <div className="space-y-6">
          <QuestionsManager
            key={`dsa-${inventoryKey}`}
            onEdit={setEditingQuestion}
            onChanged={handleInventoryChanged}
          />
          <SimulationsManager
            key={`sim-${inventoryKey}`}
            onEdit={setEditingSimulation}
            onChanged={handleInventoryChanged}
          />
        </div>
      </div>

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSuccess={() => {
            setEditingQuestion(null);
            handleInventoryChanged();
          }}
        />
      )}
      {editingSimulation && (
        <EditSimulationModal
          simulation={editingSimulation}
          onClose={() => setEditingSimulation(null)}
          onSuccess={() => {
            setEditingSimulation(null);
            handleInventoryChanged();
          }}
        />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className={`${panelSurface} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Recently updated simulations
            </p>
          </div>
          {data.recentSimulations.length === 0 ? (
            <p className="px-4 py-6 font-mono text-xs text-gray-400">No simulations yet.</p>
          ) : (
            data.recentSimulations.map((sim) => (
              <div
                key={sim.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-black/5 dark:border-white/5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-black dark:text-white truncate">
                    {sim.title}
                  </p>
                  <p className="font-mono text-[10px] text-gray-400">
                    {sim.category} · {sim.difficulty}
                  </p>
                </div>
                <span className="font-mono text-[9px] text-gray-400 shrink-0">
                  {new Date(sim.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>

        <div className={`${panelSurface} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Recently updated incidents
            </p>
          </div>
          {data.recentIncidents.length === 0 ? (
            <p className="px-4 py-6 font-mono text-xs text-gray-400">No incidents yet.</p>
          ) : (
            data.recentIncidents.map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-black/5 dark:border-white/5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-black dark:text-white truncate">
                    {inc.title}
                  </p>
                  <p className="font-mono text-[10px] text-gray-400">
                    {inc.category} · {inc.difficulty}
                  </p>
                </div>
                <span className="font-mono text-[9px] text-gray-400 shrink-0">
                  {new Date(inc.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────────────────────────
export function ActivityTab() {
  const [attempts, setAttempts] = useState<{
    id: string; email: string; username: string | null; title: string;
    status: string; score: number; maxScore: number; suspicionLevel: string;
    startedAt: string; submittedAt: string | null;
  }[]>([]);
  const [sessions, setSessions] = useState<{
    id: string; username: string; email: string; title: string;
    difficulty: string; totalScore: number; isCompleted: boolean;
    isActive: boolean; createdAt: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totals, setTotals] = useState({ attempts: 0, sessions: 0 });

  const fetchActivity = useCallback(() => {
    setLoading(true);
    api
      .get("/api/v1/admin/activity", {
        ...getAdminRequestConfig(),
        params: { page: String(page), limit: "15" },
      })
      .then((r) => {
        setAttempts(r.data.data.attempts ?? []);
        setSessions(r.data.data.incidentSessions ?? []);
        setTotals({
          attempts: r.data.data.totalAttempts ?? 0,
          sessions: r.data.data.totalSessions ?? 0,
        });
      })
      .catch(() => {
        setAttempts([]);
        setSessions([]);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const totalPages = Math.max(1, Math.ceil(Math.max(totals.attempts, totals.sessions) / 15));

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`${panelSurface} p-4`}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Assessment attempts</p>
          <p className="font-mono text-2xl font-bold text-black dark:text-white">{totals.attempts}</p>
        </div>
        <div className={`${panelSurface} p-4`}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Incident sessions</p>
          <p className="font-mono text-2xl font-bold text-black dark:text-white">{totals.sessions}</p>
        </div>
      </div>

      <div className={`${panelSurface} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Recent assessment attempts
          </p>
        </div>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-black/5 dark:border-white/5 animate-pulse" />
          ))
        ) : attempts.length === 0 ? (
          <p className="px-4 py-6 font-mono text-xs text-gray-400">No attempts yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                {["Candidate", "Assessment", "Status", "Score", "Started", "Flags"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-black dark:text-white">{a.username || a.email}</p>
                    {a.username && <p className="font-mono text-[10px] text-gray-400">{a.email}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.title}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[9px] uppercase border border-black/10 dark:border-white/10 px-2 py-0.5 text-gray-500">
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-black dark:text-white">
                    {a.score}{a.maxScore ? ` / ${a.maxScore}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                    {new Date(a.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {a.suspicionLevel !== "low" && (
                      <span className="font-mono text-[9px] uppercase text-amber-600 dark:text-amber-400">
                        {a.suspicionLevel}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={`${panelSurface} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Recent incident sessions
          </p>
        </div>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-black/5 dark:border-white/5 animate-pulse" />
          ))
        ) : sessions.length === 0 ? (
          <p className="px-4 py-6 font-mono text-xs text-gray-400">No incident sessions yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                {["User", "Incident", "Score", "Status", "Started"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-black dark:text-white">{s.username}</p>
                    <p className="font-mono text-[10px] text-gray-400">{s.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-gray-500">{s.title}</p>
                    <p className="font-mono text-[10px] text-gray-400">{s.difficulty}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-black dark:text-white">{s.totalScore}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[9px] uppercase border border-black/10 dark:border-white/10 px-2 py-0.5 text-gray-500">
                      {s.isActive ? "active" : s.isCompleted ? "completed" : "in progress"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-40`}
          >
            ← Prev
          </button>
          <span className="font-mono text-[10px] text-gray-400">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-40`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Maintenance tab ────────────────────────────────────────────────────────
interface MaintenancePageRow {
  id: string;
  path: string;
  message: string;
  enabled: boolean;
  createdAt: string;
}

export function MaintenanceTab() {
  const [pages, setPages] = useState<MaintenancePageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [messageInput, setMessageInput] = useState(
    "This page is currently under maintenance. Please check back later.",
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenancePageRow | null>(null);

  const loadPages = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/api/v1/admin/maintenance-pages", getAdminRequestConfig())
      .then((r) => setPages(r.data?.data?.pages ?? []))
      .catch(() => setError("Failed to load maintenance pages."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPages(); }, [loadPages]);

  const handleAdd = async () => {
    const path = normalizePagePath(urlInput);
    if (!path || path === "/") {
      setError("Enter a valid page URL or path (e.g. https://enum.live/dashboard/leaderboard).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post(
        "/api/v1/admin/maintenance-pages",
        { path, message: messageInput },
        getAdminRequestConfig(),
      );
      setUrlInput("");
      loadPages();
    } catch (err: unknown) {
      let msg = "Failed to add page.";
      if (isAxiosError(err)) {
        if (err.response?.status === 404) {
          msg = "Maintenance API not found. Restart the backend server (npm run dev in backend/).";
        } else {
          msg = err.response?.data?.message || msg;
        }
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (page: MaintenancePageRow) => {
    try {
      await api.patch(
        `/api/v1/admin/maintenance-pages/${page.id}`,
        { enabled: !page.enabled },
        getAdminRequestConfig(),
      );
      loadPages();
    } catch {
      setError("Failed to update page status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(
        `/api/v1/admin/maintenance-pages/${deleteTarget.id}`,
        getAdminRequestConfig(),
      );
      setDeleteTarget(null);
      loadPages();
    } catch {
      setError("Failed to remove page.");
    }
  };

  const previewPath = urlInput.trim() ? normalizePagePath(urlInput) : "";

  return (
    <div className="space-y-6">
      <div className={`${panelSurface} p-6`}>
        <h2 className="mb-1 font-mono text-sm font-bold text-black dark:text-white">
          Mark page under maintenance
        </h2>
        <p className="mb-5 font-mono text-xs text-gray-500">
          Paste a full URL or path. Users visiting that page on{" "}
          <span className="text-amber-600 dark:text-amber-400">enum.live</span> will see an
          under-maintenance message. Localhost is never blocked. Admins can still access the page
          normally on production.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className={labelCls}>Page URL or path</label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://enum.live/dashboard/leaderboard"
              className="w-full border border-black/20 bg-white px-3 py-2 font-mono text-xs text-black outline-none focus:border-black dark:border-white/25 dark:bg-black dark:text-white dark:focus:border-white"
            />
            {previewPath && (
              <p className="mt-1.5 font-mono text-[10px] text-gray-400">
                Will apply to: <span className="text-amber-600 dark:text-amber-400">{previewPath}</span>
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Maintenance message</label>
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              rows={3}
              className="w-full resize-none border border-black/20 bg-white px-3 py-2 font-mono text-xs text-black outline-none focus:border-black dark:border-white/25 dark:bg-black dark:text-white dark:focus:border-white"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 font-mono text-xs text-red-500">{error}</p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={submitting || !urlInput.trim()}
          className={`${actionButtonCls} mt-5 border-black bg-black text-white hover:bg-black/80 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90`}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {submitting ? "Adding…" : "Put page under maintenance"}
        </button>
      </div>

      <div className={`${panelSurface} overflow-hidden`}>
        <div className="border-b border-black/10 px-5 py-4 dark:border-white/10">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-black dark:text-white">
            Active maintenance pages
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-gray-400">Loading…</div>
        ) : pages.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-gray-400">
            No pages marked for maintenance yet.
          </div>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {pages.map((page) => (
              <div key={page.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-black dark:text-white">
                    {page.path}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-gray-500">{page.message}</p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                      page.enabled
                        ? "border-amber-400/40 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                        : "border-gray-300/40 bg-gray-50 text-gray-500 dark:bg-gray-900/20 dark:text-gray-400"
                    }`}
                  >
                    <Construction className="h-2.5 w-2.5" />
                    {page.enabled ? "live" : "disabled"}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(page)}
                    className={`${actionButtonCls} border-black/20 text-gray-600 hover:border-black hover:text-black dark:border-white/25 dark:text-gray-400 dark:hover:border-white dark:hover:text-white`}
                  >
                    <Power className="mr-1 h-3 w-3" />
                    {page.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(page)}
                    className={`${actionButtonCls} border-red-400/40 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20`}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDelete
          label={`Remove ${deleteTarget.path} from maintenance?`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

