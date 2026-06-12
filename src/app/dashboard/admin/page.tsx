"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy";
import AdminRoute from "@/components/auth/admin-route";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import {
  Users, Building2, FileText, BarChart3,
  ShieldCheck, Trash2, CheckCircle, XCircle, Clock,
  Search, AlertTriangle, X, Eye, Construction, Plus, Power,
} from "lucide-react";
import { normalizePagePath } from "@/lib/normalize-page-path";

// ─── Styles ───────────────────────────────────────────────────────────────────
const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 dark:bg-black/75`;
const labelCls = "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";

const getAdminRequestConfig = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
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
function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: typeof Users; accent?: string }) {
  return (
    <div className={`${panelSurface} p-5 flex items-center gap-4`}>
      <div className={`w-10 h-10 flex items-center justify-center border ${panelBorder} shrink-0 ${accent ?? ""}`}>
        <Icon className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" />
      </div>
      <div>
        <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase">{label}</p>
        <p className="font-mono text-2xl font-bold text-black dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────
function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  const setTab = (t: string) => router.push(`/dashboard/admin?tab=${t}`);

  const TABS = [
    { id: "overview",   label: "Overview",   icon: BarChart3 },
    { id: "users",      label: "Users",      icon: Users },
    { id: "companies",  label: "Companies",  icon: Building2 },
    { id: "maintenance", label: "Maintenance", icon: Construction },
  ];

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb={
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
            <ShieldCheck className="w-3 h-3" /> Admin Panel
          </span>
        }
        title="Admin Dashboard"
        description="Full platform visibility — users and companies."
      />

      {/* Tab nav */}
      <div className="flex gap-0 mb-6 border-b border-black/10 dark:border-white/10">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs tracking-wider border-b-2 transition-colors -mb-px ${
              tab === id
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-400 hover:text-black dark:hover:text-white"
            }`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === "overview"  && <OverviewTab />}
      {tab === "users"     && <UsersTab />}
      {tab === "companies" && <CompaniesTab />}
      {tab === "maintenance" && <MaintenanceTab />}
    </DashboardPageShell>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  // const [stats, setStats] = useState<Record<string, number> & { recentUsers?: unknown[]; recentCompanies?: unknown[] } | null>(null);
  const [stats, setStats] = useState<{
    [key: string]: any;
    recentUsers?: unknown[];
    recentCompanies?: unknown[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const handleOverviewApproval = async (id: string, status: string) => {
    try {
      await axios.patch(
        `${proxy}/api/v1/admin/organizations/${id}/approval`,
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
    axios.get(`${proxy}/api/v1/admin/stats`, getAdminRequestConfig())
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

// ─── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<{
    id: string; username: string; email: string; fullName: string;
    accountRole: string; isVerified: boolean; createdAt: string;
    _count: { candidateAttempts: number; incidentSessions: number };
  }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<typeof users[0] | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Record<string, unknown> | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "15" };
    if (search) params.search = search;
    axios.get(`${proxy}/api/v1/admin/users`, { ...getAdminRequestConfig(), params })
      .then(r => { setUsers(r.data.data); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetch]);

  const openDetail = async (u: typeof users[0]) => {
    setSelected(u);
    const r = await axios.get(`${proxy}/api/v1/admin/users/${u.id}`, getAdminRequestConfig());
    setSelectedDetail(r.data.data);
  };

  const handleDelete = async (id: string) => {
    await axios.delete(`${proxy}/api/v1/admin/users/${id}`, getAdminRequestConfig());
    setDelConfirm(null); setSelected(null); setSelectedDetail(null); fetch();
  };

  const totalPages = Math.ceil(total / 15);

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
                <tr key={u.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/1.5 dark:hover:bg-white/1.5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-black dark:text-white">{u.username}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className="font-mono text-[9px] uppercase border border-black/10 dark:border-white/10 px-2 py-0.5 text-gray-500">{u.accountRole}</span></td>
                  <td className="px-4 py-3">{u.isVerified ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{u._count.candidateAttempts}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetail(u)} className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDelConfirm(u.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
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
                <button onClick={() => setDelConfirm(selected.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => { setSelected(null); setSelectedDetail(null); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {!selectedDetail ? (
                <div className="animate-pulse space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 bg-black/5 dark:bg-white/5" />)}</div>
              ) : (
                <>
                  <DetailSection title="Account">
                    <DetailRow label="User ID"   value={String(selectedDetail.id)} mono />
                    <DetailRow label="Username"  value={String(selectedDetail.username)} />
                    <DetailRow label="Email"     value={String(selectedDetail.email)} />
                    <DetailRow label="Full Name" value={String(selectedDetail.fullName || "—")} />
                    <DetailRow label="Role"      value={String(selectedDetail.accountRole)} />
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delConfirm && <ConfirmDelete onCancel={() => setDelConfirm(null)} onConfirm={() => handleDelete(delConfirm)} label="Delete this user and all their data?" />}
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

function CompaniesTab() {
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
    return axios.get(`${proxy}/api/v1/admin/organizations`, config)
      .catch(() => axios.get(`${proxy}/api/v1/admin/companies`, config));
  };

  const getOrganizationById = (id: string) => {
    const config = getAdminRequestConfig();
    return axios.get(`${proxy}/api/v1/admin/organizations/${id}`, config)
      .catch(() => axios.get(`${proxy}/api/v1/admin/companies/${id}`, config));
  };

  const patchOrganizationApproval = async (id: string, status: string) => {
    const config = getAdminRequestConfig();
    try {
      return await axios.patch(`${proxy}/api/v1/admin/organizations/${id}/approval`, { status }, config);
    } catch (firstError) {
      try {
        return await axios.patch(`${proxy}/api/v1/admin/companies/${id}/approval`, { status }, config);
      } catch {
        throw firstError;
      }
    }
  };

  const deleteOrganizationById = (id: string) => {
    const config = getAdminRequestConfig();
    return axios.delete(`${proxy}/api/v1/admin/organizations/${id}`, config)
      .catch(() => axios.delete(`${proxy}/api/v1/admin/companies/${id}`, config));
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
      const message = axios.isAxiosError(err)
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

// ─── Maintenance tab ────────────────────────────────────────────────────────
interface MaintenancePageRow {
  id: string;
  path: string;
  message: string;
  enabled: boolean;
  createdAt: string;
}

function MaintenanceTab() {
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
    axios
      .get(`${proxy}/api/v1/admin/maintenance-pages`, getAdminRequestConfig())
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
      await axios.post(
        `${proxy}/api/v1/admin/maintenance-pages`,
        { path, message: messageInput },
        getAdminRequestConfig(),
      );
      setUrlInput("");
      loadPages();
    } catch (err: unknown) {
      let msg = "Failed to add page.";
      if (axios.isAxiosError(err)) {
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
      await axios.patch(
        `${proxy}/api/v1/admin/maintenance-pages/${page.id}`,
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
      await axios.delete(
        `${proxy}/api/v1/admin/maintenance-pages/${deleteTarget.id}`,
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
          Paste a full URL or path. Users visiting that page will see an under-maintenance message.
          Admins can still access the page normally.
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

// ─── Page export ──────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  return (
    <AdminRoute>
      <Suspense fallback={<DashboardPageShell maxWidth="full"><div className="animate-pulse h-8 w-48 bg-black/5 dark:bg-white/5" /></DashboardPageShell>}>
        <AdminDashboardInner />
      </Suspense>
    </AdminRoute>
  );
}
