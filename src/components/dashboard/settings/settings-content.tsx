"use client";

import api from "@/lib/api";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  Shield,
  Eye,
  Sun,
  Moon,
  KeyRound,
  LogOut,
  Copy,
  Check,
  Link2,
} from "lucide-react";

type SettingsTab = "account" | "company" | "privacy" | "security" | "appearance";

type StudentPrivacy = {
  profilePublic: boolean;
  showOnLeaderboard: boolean;
  showActivityStats: boolean;
};

type OrgPrivacy = {
  companyPagePublic: boolean;
  showContactEmail: boolean;
};

const DEFAULT_STUDENT_PRIVACY: StudentPrivacy = {
  profilePublic: true,
  showOnLeaderboard: true,
  showActivityStats: true,
};

const DEFAULT_ORG_PRIVACY: OrgPrivacy = {
  companyPagePublic: true,
  showContactEmail: false,
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

function approvalTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

function signInMethodLabel(provider: string | null): string {
  if (provider === "google") return "Google OAuth";
  if (provider === "github") return "GitHub OAuth";
  return "Email & password";
}

function isOAuthProvider(provider: string | null): boolean {
  return provider === "google" || provider === "github";
}

export default function SettingsContent() {
  const { accountType, verified, isLoading: sessionLoading } = useAccountSession();
  const isOrganization = verified && accountType === "organization";
  const authCtx = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const sessionReady = verified && !sessionLoading;
  const tabs = useMemo<{ id: SettingsTab; label: string; icon: typeof User }[]>(
    () =>
      isOrganization
        ? [
            { id: "company", label: "Company", icon: Building2 },
            { id: "privacy", label: "Privacy", icon: Eye },
            { id: "security", label: "Security", icon: Shield },
            { id: "appearance", label: "Appearance", icon: Sun },
          ]
        : [
            { id: "account", label: "Account", icon: User },
            { id: "privacy", label: "Privacy", icon: Eye },
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

  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(!isOrganization);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [username, setUsername] = useState("");
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [studentPrivacy, setStudentPrivacy] = useState<StudentPrivacy>(DEFAULT_STUDENT_PRIVACY);
  const [orgPrivacy, setOrgPrivacy] = useState<OrgPrivacy>(DEFAULT_ORG_PRIVACY);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);

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

  // ── Security ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOrganization) {
      setActiveTab((tab) => (tab === "account" ? "company" : tab));
    } else {
      setActiveTab((tab) => (tab === "company" ? "account" : tab));
    }
  }, [isOrganization]);

  const loadStudentAccount = useCallback(async () => {
    setLoadingAccount(true);
    try {
      const res = await api.get("/api/v1/users/profile", {
        withCredentials: true,
      });
      const data = res.data?.data;
      if (!data) return;
      setEmail(data.email || "");
      setProvider(data.provider || null);
      setHasPassword(Boolean(data.hasPassword));
    } catch {
      setBanner({ tone: "error", text: "Could not load account details." });
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  const loadStudentPrivacy = useCallback(async () => {
    setLoadingPrivacy(true);
    try {
      const res = await api.get("/api/v1/users/privacy", { withCredentials: true });
      const data = res.data?.data;
      if (!data) return;
      setUsername(data.username || "");
      setProvider(data.provider || null);
      setStudentPrivacy({
        profilePublic: data.profilePublic ?? true,
        showOnLeaderboard: data.showOnLeaderboard ?? true,
        showActivityStats: data.showActivityStats ?? true,
      });
    } catch {
      setBanner({ tone: "error", text: "Could not load privacy settings." });
    } finally {
      setLoadingPrivacy(false);
    }
  }, []);

  const loadOrgPrivacy = useCallback(async () => {
    setLoadingPrivacy(true);
    try {
      const res = await api.get("/api/v1/organization-dashboard/privacy", {
        withCredentials: true,
      });
      const data = res.data?.data;
      if (!data) return;
      setOrgPrivacy({
        companyPagePublic: data.companyPagePublic ?? true,
        showContactEmail: data.showContactEmail ?? false,
      });
    } catch {
      setBanner({ tone: "error", text: "Could not load privacy settings." });
    } finally {
      setLoadingPrivacy(false);
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
      loadOrgPrivacy();
    } else {
      loadStudentAccount();
      loadStudentPrivacy();
    }
  }, [
    sessionReady,
    isOrganization,
    loadCompany,
    loadStudentAccount,
    loadStudentPrivacy,
    loadOrgPrivacy,
  ]);

  const saveStudentPrivacy = async (next: StudentPrivacy) => {
    setSavingPrivacy(true);
    setBanner(null);
    try {
      const res = await api.put("/api/v1/users/privacy", next, { withCredentials: true });
      const data = res.data?.data;
      if (data) {
        setStudentPrivacy({
          profilePublic: data.profilePublic ?? true,
          showOnLeaderboard: data.showOnLeaderboard ?? true,
          showActivityStats: data.showActivityStats ?? true,
        });
      }
      setBanner({ tone: "success", text: "Privacy settings saved." });
    } catch {
      setBanner({ tone: "error", text: "Failed to save privacy settings." });
    } finally {
      setSavingPrivacy(false);
    }
  };

  const saveOrgPrivacy = async (next: OrgPrivacy) => {
    setSavingPrivacy(true);
    setBanner(null);
    try {
      const res = await api.patch("/api/v1/organization-dashboard/privacy", next, {
        withCredentials: true,
      });
      const data = res.data?.data;
      if (data) {
        setOrgPrivacy({
          companyPagePublic: data.companyPagePublic ?? true,
          showContactEmail: data.showContactEmail ?? false,
        });
      }
      setBanner({ tone: "success", text: "Privacy settings saved." });
    } catch {
      setBanner({ tone: "error", text: "Failed to save privacy settings." });
    } finally {
      setSavingPrivacy(false);
    }
  };

  const updateStudentPrivacy = <K extends keyof StudentPrivacy>(
    key: K,
    value: StudentPrivacy[K],
  ) => {
    const next = { ...studentPrivacy, [key]: value };
    setStudentPrivacy(next);
    void saveStudentPrivacy(next);
  };

  const updateOrgPrivacy = <K extends keyof OrgPrivacy>(key: K, value: OrgPrivacy[K]) => {
    const next = { ...orgPrivacy, [key]: value };
    setOrgPrivacy(next);
    void saveOrgPrivacy(next);
  };

  const profileUrl = useMemo(() => {
    if (typeof window === "undefined") return "/dashboard/profile/";
    return `${window.location.origin}/dashboard/profile/`;
  }, []);

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedProfileLink(true);
      setTimeout(() => setCopiedProfileLink(false), 2000);
    } catch {
      setBanner({ tone: "error", text: "Could not copy profile link." });
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

  const savePassword = async () => {
    if (newPassword.length < 8) {
      setBanner({ tone: "error", text: "New password must be at least 8 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setBanner({ tone: "error", text: "New password and confirmation do not match." });
      return;
    }

    if (hasPassword && !currentPassword) {
      setBanner({ tone: "error", text: "Current password is required." });
      return;
    }

    setSavingPassword(true);
    setBanner(null);
    try {
      await api.put(
        "/api/v1/users/password",
        {
          ...(hasPassword ? { currentPassword } : {}),
          newPassword,
          confirmPassword,
        },
        { withCredentials: true },
      );
      setHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setBanner({
        tone: "success",
        text: hasPassword ? "Password changed successfully." : "Password set successfully.",
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update password.";
      setBanner({ tone: "error", text: message });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await authCtx?.logout?.();
    window.location.href = "/login/";
  };

  const renderAccountPanel = () => {
    const oauthAccount = isOAuthProvider(provider);
    const settingFirstPassword = oauthAccount && !hasPassword;
    const changingPassword = hasPassword;

    return (
      <SettingsPanel
        title="Account"
        description="Manage your sign-in method and password."
        footer={
          <SaveButton
            onClick={savePassword}
            saving={savingPassword}
            label={settingFirstPassword ? "Set password" : "Change password"}
          />
        }
      >
        {loadingAccount ? (
          <div className="h-32 animate-pulse border border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input className={inputCls} value={email} disabled />
              </Field>
              <Field label="Sign-in method">
                <input className={inputCls} value={signInMethodLabel(provider)} disabled />
              </Field>
            </div>

            <div className={`${panelSurface} space-y-4 px-4 py-4`}>
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-medium text-black dark:text-white">
                    {settingFirstPassword
                      ? "Set a password"
                      : changingPassword
                        ? "Change your password"
                        : "Password"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                    {settingFirstPassword
                      ? "Add a password so you can also sign in with email and password."
                      : "Enter your current password, then choose a new one."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {changingPassword ? (
                  <Field label="Current password">
                    <input
                      className={inputCls}
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </Field>
                ) : null}
                <Field label="New password" hint="At least 8 characters.">
                  <input
                    className={inputCls}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    className={inputCls}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </div>

            <div className={`${panelSurface} flex flex-wrap items-center justify-between gap-3 px-4 py-4`}>
              <div>
                <p className="font-mono text-xs font-medium text-black dark:text-white">
                  Sign out
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                  End your session on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 border border-red-300 px-3 py-2 font-mono text-[10px] tracking-wider text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </>
        )}
      </SettingsPanel>
    );
  };

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

  const renderPrivacyPanel = () => (
    <SettingsPanel
      title="Privacy"
      description={
        isOrganization
          ? "Control what candidates and the public can see about your organization."
          : "Control what other Enum users can see about your profile and activity."
      }
    >
      {loadingPrivacy ? (
        <div className="h-32 animate-pulse border border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950" />
      ) : isOrganization ? (
        <div className="space-y-2">
          <ToggleRow
            title="Public company page"
            description="Allow your company profile to be visible on public hiring pages."
            checked={orgPrivacy.companyPagePublic}
            onChange={(v) => updateOrgPrivacy("companyPagePublic", v)}
            disabled={savingPrivacy}
          />
          <ToggleRow
            title="Show contact email to candidates"
            description="Display your primary contact email on assessment invites and results."
            checked={orgPrivacy.showContactEmail}
            onChange={(v) => updateOrgPrivacy("showContactEmail", v)}
            disabled={savingPrivacy}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <ToggleRow
              title="Public profile"
              description="Let other Enum users view your profile page."
              checked={studentPrivacy.profilePublic}
              onChange={(v) => updateStudentPrivacy("profilePublic", v)}
              disabled={savingPrivacy}
            />
            <ToggleRow
              title="Leaderboard participation"
              description="Include your rank and stats on the global leaderboard."
              checked={studentPrivacy.showOnLeaderboard}
              onChange={(v) => updateStudentPrivacy("showOnLeaderboard", v)}
              disabled={savingPrivacy}
            />
            <ToggleRow
              title="Show activity stats"
              description="Display XP, streak, and solve counts on your profile."
              checked={studentPrivacy.showActivityStats}
              onChange={(v) => updateStudentPrivacy("showActivityStats", v)}
              disabled={savingPrivacy}
            />
          </div>

          <div className={`${panelSurface} space-y-3 px-4 py-4`}>
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-medium text-black dark:text-white">
                  Profile link
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                  {studentPrivacy.profilePublic
                    ? "Share this link so others can view your public profile."
                    : "Enable public profile to share your link with others."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input className={`${inputCls} min-w-0 flex-1`} value={profileUrl} disabled />
              <button
                type="button"
                onClick={copyProfileLink}
                disabled={!studentPrivacy.profilePublic}
                className="inline-flex items-center gap-1.5 border border-black px-3 py-2 font-mono text-[10px] tracking-wider text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
              >
                {copiedProfileLink ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            {username ? (
              <p className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                Username: @{username}
              </p>
            ) : null}
          </div>

          {provider ? (
            <div className={`${panelSurface} px-4 py-4`}>
              <p className="font-mono text-xs font-medium text-black dark:text-white">
                Connected account
              </p>
              <p className="mt-1 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                Signed in with {signInMethodLabel(provider)}. OAuth connections are managed through
                your provider.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </SettingsPanel>
  );

  const renderSecurityPanel = () => (
    <SettingsPanel
      title="Active sessions"
      description="Devices currently signed in to your account."
    >
      <SessionsPanel compact />
    </SettingsPanel>
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
      case "privacy":
        return renderPrivacyPanel();
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
