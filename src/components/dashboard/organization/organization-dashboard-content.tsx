"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import {
  FileText,
  Users,
  BarChart3,
  AlertTriangle,
  BookOpen,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  Eye,
  Send,
  TrendingUp,
} from "lucide-react";
import { TestLinkCopy } from "@/components/dashboard/organization/test-link-copy";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const panelHover =
  "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:border-black hover:bg-white/45 hover:shadow-sm hover:-translate-y-0.5 dark:hover:border-white dark:hover:bg-black/40 dark:hover:shadow-white/5";
const statCard = `${panelSurface} p-4`;

interface Metrics {
  totalAssessments: number;
  activeAssessments: number;
  draftAssessments: number;
  candidatesInvited: number;
  candidatesCompleted: number;
  averageScore: number;
  suspiciousAttempts: number;
  totalQuestionBanks: number;
  totalCertificatesIssued: number;
}

interface RecentTest {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  testCode: string;
}

interface RecentAttempt {
  id: string;
  email: string;
  status: string;
  totalScore: number;
  startedAt: string;
  suspicionLevel: string;
  assessment: { title: string };
}

interface RecentViolation {
  id: string;
  type: string;
  severity: string;
  timestamp: string;
  attempt: { email: string; assessment: { title: string } };
}

export default function OrganizationDashboardContent() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [recentViolations, setRecentViolations] = useState<RecentViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityTab, setActivityTab] = useState<"tests" | "attempts" | "violations">("tests");

  const [organizationName] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("displayName") || localStorage.getItem("Name") || "Organization"
      : "Organization",
  );

  useEffect(() => {
    Promise.all([
      axios.get(`${proxy}/api/v1/organization-dashboard/metrics`).catch(() => null),
      axios.get(`${proxy}/api/v1/organization-dashboard/recent-activity`).catch(() => null),
    ]).then(([mRes, aRes]) => {
      if (mRes?.data?.data) setMetrics(mRes.data.data);
      if (aRes?.data?.data) {
        setRecentTests(aRes.data.data.recentTests || []);
        setRecentAttempts(aRes.data.data.recentAttempts || []);
        setRecentViolations(aRes.data.data.recentViolations || []);
      }
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 5 ? "Still up," : hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : hour < 21 ? "Good evening," : "Still working,";
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const statusColor = (s: string) => {
    if (s === "published" || s === "submitted" || s === "completed") return "text-emerald-600 dark:text-emerald-400 border-emerald-400/40";
    if (s === "draft" || s === "in_progress" || s === "pending") return "text-amber-600 dark:text-amber-400 border-amber-400/40";
    if (s === "archived" || s === "flagged" || s === "auto_submitted") return "text-gray-500 dark:text-gray-400 border-gray-400/40";
    return "text-gray-500 border-gray-300";
  };

  const severityColor = (s: string) => {
    if (s === "high") return "text-red-600 dark:text-red-400";
    if (s === "medium") return "text-amber-600 dark:text-amber-400";
    return "text-gray-500 dark:text-gray-400";
  };

  if (loading) {
    return (
      <div className="space-y-5 pb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="h-8 w-64 bg-black/5 dark:bg-white/5 animate-pulse" />
            <div className="h-4 w-40 bg-black/5 dark:bg-white/5 animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${panelSurface} p-4`}>
              <div className="h-3 w-16 bg-black/5 dark:bg-white/5 animate-pulse mb-3" />
              <div className="h-8 w-12 bg-black/5 dark:bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
        <div className={`${panelSurface} p-6`}>
          <div className="h-4 w-32 bg-black/5 dark:bg-white/5 animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const m = metrics || {
    totalAssessments: 0, activeAssessments: 0, draftAssessments: 0,
    candidatesInvited: 0, candidatesCompleted: 0, averageScore: 0,
    suspiciousAttempts: 0, totalQuestionBanks: 0, totalCertificatesIssued: 0,
  };

  const metricCards = [
    { label: "Total Tests", value: m.totalAssessments, icon: FileText },
    { label: "Active", value: m.activeAssessments, icon: CheckCircle },
    { label: "Drafts", value: m.draftAssessments, icon: Clock },
    { label: "Invited", value: m.candidatesInvited, icon: Send },
    { label: "Completed", value: m.candidatesCompleted, icon: Users },
    { label: "Avg Score", value: `${m.averageScore}%`, icon: TrendingUp },
    { label: "Suspicious", value: m.suspiciousAttempts, icon: AlertTriangle },
    { label: "Q. Banks", value: m.totalQuestionBanks, icon: BookOpen },
  ];

  const quickActions = [
    { label: "Create Test", href: "/dashboard/tests/create", icon: Plus },
    { label: "Manage Tests", href: "/dashboard/tests", icon: FileText },
    { label: "Question Banks", href: "/dashboard/question-banks", icon: BookOpen },
    { label: "Candidates", href: "/dashboard/candidates", icon: Users },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white md:text-3xl">
            {greeting} {organizationName}.
          </h1>
          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
            Your assessment command center.
          </p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <p className="font-mono text-xl font-bold text-black dark:text-white tabular-nums">{timeStr}</p>
          <p className="font-mono text-[10px] text-gray-400">{dateStr}</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={statCard}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
                  {card.label}
                </span>
                <Icon className="w-3.5 h-3.5 text-gray-400 opacity-60" />
              </div>
              <p className="text-3xl font-black text-black dark:text-white tabular-nums leading-none">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-5 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={`group ${panelSurface} ${panelHover} flex flex-col items-center gap-2 p-4 text-center`}
            >
              <div className={`${panelBorder} p-2 transition-colors group-hover:border-black dark:group-hover:border-white`}>
                <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </div>
              <span className="font-mono text-[10px] tracking-wider text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className={`${panelSurface} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
            Recent Activity
          </h2>
          <div className="flex gap-0">
            {(["tests", "attempts", "violations"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivityTab(tab)}
                className={`px-3 py-1 font-mono text-[10px] tracking-wider border transition-colors ${
                  activityTab === tab
                    ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                    : "bg-transparent text-gray-500 border-gray-300 dark:border-neutral-700 hover:border-gray-500 dark:hover:border-neutral-400"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tests Tab */}
        {activityTab === "tests" && (
          <div className="space-y-2">
            {recentTests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                <p className="font-mono text-xs text-gray-400">No tests created yet.</p>
                <Link href="/dashboard/tests/create" className="inline-flex items-center gap-1 mt-2 font-mono text-xs text-black dark:text-white hover:underline">
                  Create your first test <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              recentTests.map((test) => (
                <div
                  key={test.id}
                  className={`p-3 ${panelBorder} hover:border-black dark:hover:border-white transition-colors`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <Link href="/dashboard/tests" className="flex items-center gap-3 min-w-0 flex-1 group">
                      <FileText className="w-4 h-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-black dark:text-white truncate group-hover:underline">
                          {test.title}
                        </p>
                        <p className="font-mono text-[10px] text-gray-400">
                          {new Date(test.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase ${statusColor(test.status)}`}>
                        {test.status}
                      </span>
                      <TestLinkCopy testCode={test.testCode} compact />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Attempts Tab */}
        {activityTab === "attempts" && (
          <div className="space-y-2">
            {recentAttempts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                <p className="font-mono text-xs text-gray-400">No candidate attempts yet.</p>
              </div>
            ) : (
              recentAttempts.map((attempt) => (
                <div key={attempt.id} className={`flex items-center justify-between p-3 ${panelBorder}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black dark:text-white truncate">{attempt.email}</p>
                    <p className="font-mono text-[10px] text-gray-400">{attempt.assessment.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">{attempt.totalScore}pts</span>
                    <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase ${statusColor(attempt.status)}`}>
                      {attempt.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Violations Tab */}
        {activityTab === "violations" && (
          <div className="space-y-2">
            {recentViolations.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                <p className="font-mono text-xs text-gray-400">No violations recorded.</p>
              </div>
            ) : (
              recentViolations.map((v) => (
                <div key={v.id} className={`flex items-center justify-between p-3 ${panelBorder}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black dark:text-white truncate">
                      {v.type.replace("_", " ")}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400">
                      {v.attempt.email} — {v.attempt.assessment.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-[10px] font-bold uppercase ${severityColor(v.severity)}`}>{v.severity}</span>
                    <span className="font-mono text-[10px] text-gray-400 tabular-nums">
                      {new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
