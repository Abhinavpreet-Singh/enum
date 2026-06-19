"use client";
import { getMemoryToken } from "@/lib/tokenStore";

import { useState, useEffect } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { Settings, Megaphone, Plus, Trash2, Check, X, ChevronDown, ChevronUp, AlertTriangle, Info } from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 dark:bg-black/75`;
const labelCls = "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";

const cfg = () => {
  const token = typeof window !== "undefined" ? getMemoryToken() : null;
  return { withCredentials: true as const, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
};

type Setting = { key: string; value: string; label: string; group: string };

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "critical";
  audience: "all" | "students" | "organizations";
  active: boolean;
  createdAt: string;
};

const ANNOUNCEMENT_ICON: Record<string, typeof Info> = { info: Info, warning: AlertTriangle, critical: AlertTriangle };
const ANNOUNCEMENT_COLORS: Record<string, string> = {
  info: "text-sky-600 dark:text-sky-400 border-sky-400/40 bg-sky-50 dark:bg-sky-950/20",
  warning: "text-amber-600 dark:text-amber-400 border-amber-400/40 bg-amber-50 dark:bg-amber-950/20",
  critical: "text-red-600 dark:text-red-400 border-red-400/40 bg-red-50 dark:bg-red-950/20",
};

function isBoolSetting(key: string) {
  return [
    "signup_enabled", "org_self_register", "leaderboard_public",
    "collab_enabled", "incidents_enabled", "dsa_arena_enabled",
  ].includes(key);
}

export default function SettingsSection() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [expandedGroup, setExpandedGroup] = useState<string>("features");

  // New announcement form
  const [newAnn, setNewAnn] = useState({ title: "", body: "", type: "info", audience: "all" });
  const [creatingAnn, setCreatingAnn] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annError, setAnnError] = useState("");

  useEffect(() => {
    axios.get(`${proxy}/api/v1/admin/settings`, cfg())
      .then((r) => {
        setSettings(r.data.data);
        const vals: Record<string, string> = {};
        r.data.data.forEach((s: Setting) => { vals[s.key] = s.value; });
        setSettingValues(vals);
      })
      .finally(() => setLoadingSettings(false));

    axios.get(`${proxy}/api/v1/admin/announcements`, cfg())
      .then((r) => setAnnouncements(r.data.data))
      .finally(() => setLoadingAnn(false));
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      await axios.patch(`${proxy}/api/v1/admin/settings/${key}`, { value }, cfg());
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
    } catch {}
    setSaving(null);
  };

  const toggleBool = (key: string) => {
    const current = settingValues[key] === "true";
    const next = String(!current);
    setSettingValues((prev) => ({ ...prev, [key]: next }));
    saveSetting(key, next);
  };

  const saveText = (key: string) => {
    saveSetting(key, settingValues[key] ?? "");
  };

  const createAnnouncement = async () => {
    if (!newAnn.title.trim() || !newAnn.body.trim()) {
      setAnnError("Title and body are required.");
      return;
    }
    setCreatingAnn(true);
    setAnnError("");
    try {
      const r = await axios.post(`${proxy}/api/v1/admin/announcements`, newAnn, cfg());
      setAnnouncements((prev) => [r.data.data, ...prev]);
      setNewAnn({ title: "", body: "", type: "info", audience: "all" });
      setShowAnnForm(false);
    } catch (e: unknown) {
      setAnnError(axios.isAxiosError(e) ? e.response?.data?.message || "Failed." : "Failed.");
    } finally {
      setCreatingAnn(false);
    }
  };

  const toggleAnnActive = async (ann: Announcement) => {
    try {
      const r = await axios.patch(`${proxy}/api/v1/admin/announcements/${ann.id}`, { active: !ann.active }, cfg());
      setAnnouncements((prev) => prev.map((a) => (a.id === ann.id ? r.data.data : a)));
    } catch {}
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await axios.delete(`${proxy}/api/v1/admin/announcements/${id}`, cfg());
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  };

  const groups: Record<string, Setting[]> = {};
  settings.forEach((s) => {
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  });

  return (
    <div className="space-y-8">
      {/* ── Feature flags & settings ── */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
          <Settings className="w-3.5 h-3.5" /> Platform Settings
        </p>

        {loadingSettings ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${panelSurface} p-4 h-16 animate-pulse mb-2`} />
          ))
        ) : (
          Object.entries(groups).map(([group, items]) => (
            <div key={group} className={`${panelSurface} overflow-hidden mb-3`}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 hover:bg-black/1 dark:hover:bg-white/1 transition-colors"
                onClick={() => setExpandedGroup(expandedGroup === group ? "" : group)}
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-black dark:text-white font-semibold">
                  {group.charAt(0).toUpperCase() + group.slice(1)}
                </span>
                {expandedGroup === group ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>

              {expandedGroup === group && (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {items.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-black dark:text-white">{s.label}</p>
                        <p className="font-mono text-[10px] text-gray-400">{s.key}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isBoolSetting(s.key) ? (
                          <button
                            onClick={() => toggleBool(s.key)}
                            disabled={saving === s.key}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              settingValues[s.key] === "true"
                                ? "bg-black dark:bg-white"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
                                settingValues[s.key] === "true"
                                  ? "translate-x-5 bg-white dark:bg-black"
                                  : "translate-x-0 bg-white dark:bg-white"
                              }`}
                            />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={settingValues[s.key] ?? s.value}
                              onChange={(e) => setSettingValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                              className={`w-36 px-2 py-1 font-mono text-xs border ${panelBorder} bg-transparent text-black dark:text-white outline-none focus:border-black dark:focus:border-white`}
                            />
                            <button
                              onClick={() => saveText(s.key)}
                              disabled={saving === s.key}
                              className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {saving === s.key && (
                          <span className="font-mono text-[9px] text-gray-400">saving…</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Announcements ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5" /> Announcements
          </p>
          <button
            onClick={() => setShowAnnForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase border border-black bg-black text-white dark:border-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
          >
            <Plus className="w-3 h-3" /> New
          </button>
        </div>

        {/* Create form */}
        {showAnnForm && (
          <div className={`${panelSurface} p-5 mb-4`}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-3">New announcement</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Title</label>
                <input
                  type="text"
                  value={newAnn.title}
                  onChange={(e) => setNewAnn((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Scheduled maintenance tonight…"
                  className={`w-full px-3 py-2 font-mono text-xs border ${panelBorder} bg-transparent text-black dark:text-white outline-none focus:border-black dark:focus:border-white`}
                />
              </div>
              <div>
                <label className={labelCls}>Body</label>
                <textarea
                  value={newAnn.body}
                  onChange={(e) => setNewAnn((p) => ({ ...p, body: e.target.value }))}
                  rows={3}
                  placeholder="We will be performing maintenance…"
                  className={`w-full px-3 py-2 font-mono text-xs border resize-none ${panelBorder} bg-transparent text-black dark:text-white outline-none focus:border-black dark:focus:border-white`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type</label>
                  <select
                    value={newAnn.type}
                    onChange={(e) => setNewAnn((p) => ({ ...p, type: e.target.value }))}
                    className={`w-full px-3 py-2 font-mono text-xs border ${panelBorder} bg-transparent text-black dark:text-white outline-none`}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Audience</label>
                  <select
                    value={newAnn.audience}
                    onChange={(e) => setNewAnn((p) => ({ ...p, audience: e.target.value }))}
                    className={`w-full px-3 py-2 font-mono text-xs border ${panelBorder} bg-transparent text-black dark:text-white outline-none`}
                  >
                    <option value="all">All users</option>
                    <option value="students">Students only</option>
                    <option value="organizations">Organizations only</option>
                  </select>
                </div>
              </div>
              {annError && <p className="font-mono text-xs text-red-500">{annError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={createAnnouncement}
                  disabled={creatingAnn}
                  className="px-4 py-2 font-mono text-xs bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {creatingAnn ? "Publishing…" : "Publish"}
                </button>
                <button
                  onClick={() => { setShowAnnForm(false); setAnnError(""); }}
                  className={`px-4 py-2 font-mono text-xs border ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcement list */}
        {loadingAnn ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${panelSurface} p-4 h-20 animate-pulse mb-2`} />
          ))
        ) : announcements.length === 0 ? (
          <div className={`${panelSurface} p-8 text-center`}>
            <Megaphone className="w-6 h-6 text-gray-200 dark:text-gray-800 mx-auto mb-2" />
            <p className="font-mono text-xs text-gray-400">No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((ann) => {
              const Icon = ANNOUNCEMENT_ICON[ann.type] ?? Info;
              return (
                <div key={ann.id} className={`${panelSurface} p-4 flex gap-4 ${!ann.active ? "opacity-50" : ""}`}>
                  <div className={`shrink-0 w-8 h-8 flex items-center justify-center border rounded-none ${ANNOUNCEMENT_COLORS[ann.type] ?? ""}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-xs font-bold text-black dark:text-white">{ann.title}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-mono text-[9px] uppercase text-gray-400 border border-black/10 dark:border-white/10 px-1.5 py-0.5">
                          {ann.audience}
                        </span>
                      </div>
                    </div>
                    <p className="font-mono text-[10px] text-gray-500 mt-1 line-clamp-2">{ann.body}</p>
                    <p className="font-mono text-[9px] text-gray-400 mt-1">
                      {new Date(ann.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => toggleAnnActive(ann)}
                      className={`p-1 transition-colors ${ann.active ? "text-emerald-500 hover:text-gray-400" : "text-gray-400 hover:text-emerald-500"}`}
                      title={ann.active ? "Deactivate" : "Activate"}
                    >
                      {ann.active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
