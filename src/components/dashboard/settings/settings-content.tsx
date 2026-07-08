"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getMemoryToken } from "@/lib/tokenStore";
import { AuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/theme-provider";
import { useAccountSession } from "@/hooks/useAccountType";
import SessionsPanel from "./sessions-panel";
import {
  Field,
  SaveButton,
  SettingsPanel,
  SettingsTabButton,
  StatusBadge,
  ToggleRow,
  MessageBanner,
  inputCls,
  panelSurface,
} from "./settings-ui";
import {
  User,
  Building2,
  Bell,
  Shield,
  Sun,
  Moon,
  Camera,
  ExternalLink,
  Mail,
  KeyRound,
  LogOut,
} from "lucide-react";

type SettingsTab = "account" | "company" | "notifications" | "security" | "appearance";

type StudentNotificationPrefs = {
  productUpdates: boolean;
  weeklyDigest: boolean;
  streakReminders: boolean;
  leaderboardUpdates: boolean;
};

type OrgNotificationPrefs = {
  candidateSubmissions: boolean;
  violationAlerts: boolean;
  weeklyReports: boolean;
  productUpdates: boolean;
};

const DEFAULT_STUDENT_NOTIFICATIONS: StudentNotificationPrefs = {
  productUpdates: true,
  weeklyDigest: true,
  streakReminders: true,
  leaderboardUpdates: false,
};

const DEFAULT_ORG_NOTIFICATIONS: OrgNotificationPrefs = {
  candidateSubmissions: true,
  violationAlerts: true,
  weeklyReports: true,
  productUpdates: true,
};

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Consulting",
  "Manufacturing",
  "Retail",
  "Other",
];

const SIZE_OPTIONS = ["1-10", "11-50", "51-200", "200+"];

function loadPrefs<T>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function savePrefs<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function approvalTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

export default function SettingsContent() {
  const { accountType, verified, isLoading: sessionLoading } = useAccountSession();
  const isOrganization = verified && accountType === "organization";
  const authCtx = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const sessionReady = verified && !sessionLoading;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = useMemo<{ id: SettingsTab; label: string; icon: typeof User }[]>(
    () =>
      isOrganization
        ? [
            { id: "company", label: "Company", icon: Building2 },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "security", label: "Security", icon: Shield },
            { id: "appearance", label: "Appearance", icon: Sun },
          ]
        : [
            { id: "account", label: "Account", icon: User },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "security", label: "Security", icon: Shield },
            { id: "appearance", label: "Appearance", icon: Sun },
          ],
    [isOrganization],
  );

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isOrganization ? "company" : "account",
  );
  const [banner, setBanner] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(
    null,
  );

  // ── Student account state ─────────────────────────────────────────────────
  const [loadingAccount, setLoadingAccount] = useState(!isOrganization);
  const [savingAccount, setSavingAccount] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  // ── Organization state ────────────────────────────────────────────────────
  const [loadingCompany, setLoadingCompany] = useState(isOrganization);
  const [savingCompany, setSavingCompany] = useState(false);
  const [company, setCompany] = useState({
    name: "",
    email: "",
    website: "",
    industry: "",
    size: "",
    location: "",
    description: "",
    contactName: "",
    contactEmail: "",
    approvalStatus: "pending",
  });

  // ── Notifications (local until backend exists) ────────────────────────────
  const prefsKey = useMemo(
    () => `enum:notification-prefs:${accountType}:${email || "default"}`,
    [accountType, email],
  );
  const [studentNotifications, setStudentNotifications] = useState(DEFAULT_STUDENT_NOTIFICATIONS);
  const [orgNotifications, setOrgNotifications] = useState(DEFAULT_ORG_NOTIFICATIONS);

  // ── Security ──────────────────────────────────────────────────────────────
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (isOrganization) {
      setActiveTab((tab) => (tab === "account" ? "company" : tab));
    } else {
      setActiveTab((tab) => (tab === "company" ? "account" : tab));
    }
  }, [isOrganization]);

  useEffect(() => {
    if (!email) return;
    if (isOrganization) {
      setOrgNotifications(loadPrefs(prefsKey, DEFAULT_ORG_NOTIFICATIONS));
    } else {
      setStudentNotifications(loadPrefs(prefsKey, DEFAULT_STUDENT_NOTIFICATIONS));
    }
  }, [prefsKey, isOrganization, email]);

  const loadStudentAccount = useCallback(async () => {
    setLoadingAccount(true);
    try {
      const res = await api.get("/api/v1/users/profile", {
        withCredentials: true,
      });
      const data = res.data?.data;
      if (!data) return;
      setDisplayName(data.displayName || data.username || "");
      setEmail(data.email || "");
      setUsername(data.username || "");
      setProvider(data.provider || null);
      setAvatar(data.avatar || localStorage.getItem("userAvatar") || null);
    } catch {
      setBanner({ tone: "error", text: "Could not load account details." });
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  const loadCompany = useCallback(async () => {
    setLoadingCompany(true);
    try {
      const res = await api.get("/api/v1/organization-dashboard/profile", {
        withCredentials: true,
      });
      const data = res.data?.data;
      if (!data) return;
      setCompany({
        name: data.name || "",
        email: data.email || "",
        website: data.website || "",
        industry: data.industry || "",
        size: data.size || "",
        location: data.location || "",
        description: data.description || "",
        contactName: data.contactName || "",
        contactEmail: data.contactEmail || "",
        approvalStatus: data.approvalStatus || "pending",
      });
      setEmail(data.email || "");
    } catch {
      setBanner({ tone: "error", text: "Could not load company profile." });
    } finally {
      setLoadingCompany(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (isOrganization) {
      loadCompany();
    } else {
      loadStudentAccount();
    }
  }, [sessionReady, isOrganization, loadCompany, loadStudentAccount]);

  const saveStudentAccount = async () => {
    setSavingAccount(true);
    setBanner(null);
    try {
      await api.put(
        "/api/v1/users/profile",
        { displayName },
        { withCredentials: true },
      );
      window.dispatchEvent(
        new CustomEvent("userNameChanged", { detail: displayName }),
      );
      setBanner({ tone: "success", text: "Account updated successfully." });
    } catch {
      setBanner({ tone: "error", text: "Failed to save account changes." });
    } finally {
      setSavingAccount(false);
    }
  };

  const saveCompany = async () => {
    setSavingCompany(true);
    setBanner(null);
    try {
      const { email: _email, approvalStatus: _status, ...payload } = company;
      await api.patch("/api/v1/organization-dashboard/profile", payload, {
        withCredentials: true,
      });
      setBanner({ tone: "success", text: "Company profile updated successfully." });
    } catch {
      setBanner({ tone: "error", text: "Failed to save company profile." });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setAvatar(src);
      localStorage.setItem("userAvatar", src);
      window.dispatchEvent(new Event("userAvatarChanged"));
    };
    reader.readAsDataURL(file);

    const token = getMemoryToken();
    if (!token) return;
    const formData = new FormData();
    formData.append("avatar", file);
    api
      .post("/api/v1/users/avatar", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        const url = res.data?.data?.avatar;
        if (!url) return;
        setAvatar(url);
        localStorage.setItem("userAvatar", url);
        window.dispatchEvent(new Event("userAvatarChanged"));
        setBanner({ tone: "success", text: "Avatar updated." });
      })
      .catch(() => {
        setBanner({ tone: "error", text: "Avatar upload failed." });
      });
  };

  const updateStudentNotification = <K extends keyof StudentNotificationPrefs>(
    key: K,
    value: StudentNotificationPrefs[K],
  ) => {
    const next = { ...studentNotifications, [key]: value };
    setStudentNotifications(next);
    savePrefs(prefsKey, next);
  };

  const updateOrgNotification = <K extends keyof OrgNotificationPrefs>(
    key: K,
    value: OrgNotificationPrefs[K],
  ) => {
    const next = { ...orgNotifications, [key]: value };
    setOrgNotifications(next);
    savePrefs(prefsKey, next);
  };

  const sendPasswordReset = async () => {
    if (!email) return;
    setSendingReset(true);
    setBanner(null);
    try {
      await api.post("/api/v1/auth/password-reset/request", {
        email,
        accountType: isOrganization ? "organization" : "student",
      });
      setBanner({
        tone: "success",
        text: `Password reset link sent to ${email}.`,
      });
    } catch {
      setBanner({ tone: "error", text: "Could not send password reset email." });
    } finally {
      setSendingReset(false);
    }
  };

  const handleLogout = async () => {
    await authCtx?.logout?.();
    window.location.href = "/login/";
  };

  const renderAccountPanel = () => (
    <SettingsPanel
      title="Account"
      description="Manage how you appear on Enum and update your login identity."
      footer={<SaveButton onClick={saveStudentAccount} saving={savingAccount} />}
    >
      {loadingAccount ? (
        <div className="h-32 animate-pulse border border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-20 w-20 overflow-hidden rounded-full border border-black/15 bg-linear-to-br from-gray-700 to-gray-900 dark:border-white/20"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                  {(displayName || username || "U").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div>
              <p className="font-mono text-xs font-medium text-black dark:text-white">
                Profile photo
              </p>
              <p className="mt-1 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                JPG or PNG, up to 5 MB.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <input
                className={inputCls}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </Field>
            <Field label="Username" hint="Used in your public profile URL.">
              <input className={inputCls} value={username} disabled />
            </Field>
            <Field label="Email" hint="Contact support to change your email.">
              <input className={inputCls} value={email} disabled />
            </Field>
            <Field label="Sign-in method">
              <input
                className={inputCls}
                value={provider ? `${provider.charAt(0).toUpperCase()}${provider.slice(1)} OAuth` : "Email & password"}
                disabled
              />
            </Field>
          </div>

          <div className={`${panelSurface} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}>
            <div>
              <p className="font-mono text-xs font-medium text-black dark:text-white">
                Public profile
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                Edit bio, skills, certifications, and social links.
              </p>
            </div>
            <Link
              href="/dashboard/profile/"
              className="inline-flex items-center gap-1.5 border border-black px-3 py-1.5 font-mono text-[10px] tracking-wider text-black transition-colors hover:bg-black hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
            >
              Open profile
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </>
      )}
    </SettingsPanel>
  );

  const renderCompanyPanel = () => (
    <SettingsPanel
      title="Company profile"
      description="Keep your hiring brand and contact details up to date for candidates."
      footer={<SaveButton onClick={saveCompany} saving={savingCompany} />}
    >
      {loadingCompany ? (
        <div className="h-40 animate-pulse border border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={approvalTone(company.approvalStatus)}>
              {company.approvalStatus}
            </StatusBadge>
            <p className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
              Account review status for your organization.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <input
                className={inputCls}
                value={company.name}
                onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
              />
            </Field>
            <Field label="Login email" hint="Cannot be changed here.">
              <input className={inputCls} value={company.email} disabled />
            </Field>
            <Field label="Website">
              <input
                className={inputCls}
                value={company.website}
                onChange={(e) => setCompany((c) => ({ ...c, website: e.target.value }))}
                placeholder="https://company.com"
              />
            </Field>
            <Field label="Location">
              <input
                className={inputCls}
                value={company.location}
                onChange={(e) => setCompany((c) => ({ ...c, location: e.target.value }))}
                placeholder="City, Country"
              />
            </Field>
            <Field label="Industry">
              <select
                className={inputCls}
                value={company.industry}
                onChange={(e) => setCompany((c) => ({ ...c, industry: e.target.value }))}
              >
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Company size">
              <select
                className={inputCls}
                value={company.size}
                onChange={(e) => setCompany((c) => ({ ...c, size: e.target.value }))}
              >
                <option value="">Select size</option>
                {SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} employees
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="About the company">
            <textarea
              className={`${inputCls} min-h-24 resize-y`}
              value={company.description}
              onChange={(e) => setCompany((c) => ({ ...c, description: e.target.value }))}
              placeholder="What does your company do? What kind of talent are you hiring?"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary contact name">
              <input
                className={inputCls}
                value={company.contactName}
                onChange={(e) => setCompany((c) => ({ ...c, contactName: e.target.value }))}
              />
            </Field>
            <Field label="Primary contact email">
              <input
                className={inputCls}
                type="email"
                value={company.contactEmail}
                onChange={(e) => setCompany((c) => ({ ...c, contactEmail: e.target.value }))}
              />
            </Field>
          </div>
        </>
      )}
    </SettingsPanel>
  );

  const renderNotificationsPanel = () => (
    <SettingsPanel
      title="Notifications"
      description="Choose what updates you want to hear about. Preferences are saved on this device."
    >
      {isOrganization ? (
        <div className="space-y-2">
          <ToggleRow
            title="Candidate submissions"
            description="Get notified when a candidate completes an assessment."
            checked={orgNotifications.candidateSubmissions}
            onChange={(v) => updateOrgNotification("candidateSubmissions", v)}
          />
          <ToggleRow
            title="Proctoring violations"
            description="Alerts for medium and high severity violations during live tests."
            checked={orgNotifications.violationAlerts}
            onChange={(v) => updateOrgNotification("violationAlerts", v)}
          />
          <ToggleRow
            title="Weekly hiring report"
            description="Summary of invites, completions, and average scores."
            checked={orgNotifications.weeklyReports}
            onChange={(v) => updateOrgNotification("weeklyReports", v)}
          />
          <ToggleRow
            title="Product updates"
            description="New Enum features for assessment teams and recruiters."
            checked={orgNotifications.productUpdates}
            onChange={(v) => updateOrgNotification("productUpdates", v)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <ToggleRow
            title="Streak reminders"
            description="Nudges when your practice streak is about to break."
            checked={studentNotifications.streakReminders}
            onChange={(v) => updateStudentNotification("streakReminders", v)}
          />
          <ToggleRow
            title="Weekly progress digest"
            description="A recap of problems solved, simulations, and XP earned."
            checked={studentNotifications.weeklyDigest}
            onChange={(v) => updateStudentNotification("weeklyDigest", v)}
          />
          <ToggleRow
            title="Leaderboard movement"
            description="Alerts when your global rank changes significantly."
            checked={studentNotifications.leaderboardUpdates}
            onChange={(v) => updateStudentNotification("leaderboardUpdates", v)}
          />
          <ToggleRow
            title="Product updates"
            description="New tracks, arenas, and platform improvements."
            checked={studentNotifications.productUpdates}
            onChange={(v) => updateStudentNotification("productUpdates", v)}
          />
        </div>
      )}
    </SettingsPanel>
  );

  const renderSecurityPanel = () => (
    <div className="space-y-5">
      <SettingsPanel
        title="Password & sign-in"
        description="Reset your password or review how you authenticate."
      >
        <div className={`${panelSurface} space-y-4 px-4 py-4`}>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-medium text-black dark:text-white">
                {email || "No email on file"}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                We&apos;ll email a secure link to reset your password.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={sendPasswordReset}
            disabled={!email || sendingReset}
            className="inline-flex items-center gap-2 border border-black px-3 py-2 font-mono text-[10px] tracking-wider text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {sendingReset ? "Sending…" : "Send reset link"}
          </button>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Active sessions"
        description="Devices currently signed in to your account."
      >
        <SessionsPanel compact />
      </SettingsPanel>

      <SettingsPanel title="Sign out" description="End your session on this device.">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 border border-red-300 px-3 py-2 font-mono text-[10px] tracking-wider text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </SettingsPanel>
    </div>
  );

  const renderAppearancePanel = () => (
    <SettingsPanel
      title="Appearance"
      description="Customize how Enum looks on your screen."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => theme !== "light" && toggleTheme()}
          className={`${panelSurface} p-4 text-left transition-colors ${
            theme === "light" ? "border-black dark:border-white" : ""
          }`}
        >
          <div className="mb-3 flex h-16 items-center justify-center border border-black/10 bg-white dark:border-white/10">
            <Sun className="h-6 w-6 text-amber-500" />
          </div>
          <p className="font-mono text-xs font-medium text-black dark:text-white">Light</p>
          <p className="mt-1 font-mono text-[10px] text-gray-500 dark:text-gray-400">
            Clean white interface for bright environments.
          </p>
        </button>
        <button
          type="button"
          onClick={() => theme !== "dark" && toggleTheme()}
          className={`${panelSurface} p-4 text-left transition-colors ${
            theme === "dark" ? "border-black dark:border-white" : ""
          }`}
        >
          <div className="mb-3 flex h-16 items-center justify-center border border-white/10 bg-black">
            <Moon className="h-6 w-6 text-sky-300" />
          </div>
          <p className="font-mono text-xs font-medium text-black dark:text-white">Dark</p>
          <p className="mt-1 font-mono text-[10px] text-gray-500 dark:text-gray-400">
            High-contrast black theme for low-light sessions.
          </p>
        </button>
      </div>
    </SettingsPanel>
  );

  const renderActivePanel = () => {
    switch (activeTab) {
      case "account":
        return renderAccountPanel();
      case "company":
        return renderCompanyPanel();
      case "notifications":
        return renderNotificationsPanel();
      case "security":
        return renderSecurityPanel();
      case "appearance":
        return renderAppearancePanel();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {banner ? <MessageBanner tone={banner.tone}>{banner.text}</MessageBanner> : null}

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${panelSurface} h-fit p-2 lg:sticky lg:top-6`}>
          <nav className="hidden space-y-1 lg:block">
            {tabs.map((tab) => (
              <SettingsTabButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                active={activeTab === tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setBanner(null);
                }}
              />
            ))}
          </nav>
          <div className="flex gap-2 overflow-x-auto lg:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setBanner(null);
                }}
                className={`shrink-0 border px-3 py-2 font-mono text-[10px] tracking-wider uppercase ${
                  activeTab === tab.id
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-transparent text-gray-500 dark:text-gray-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">{renderActivePanel()}</div>
      </div>
    </div>
  );
}
