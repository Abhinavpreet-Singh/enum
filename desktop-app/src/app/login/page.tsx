"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import desktopApi from "@/lib/api";
import { useExamStore } from "@/store/exam-store";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useExamStore((s) => s.setAuth);
  const setAssessment = useExamStore((s) => s.setAssessment);

  const [step, setStep] = useState<"link" | "credentials">("link");
  const [testCode, setTestCode] = useState("");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [orgName, setOrgName] = useState("");

  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ─── Step 1: Validate test code / link ──────────────────────────────────
  async function handleValidateCode() {
    setError("");
    const raw = testCode.trim();
    if (!raw) { setError("Please enter a test code or assessment link."); return; }

    // Extract code from a URL like https://enum.live/test/abc123
    const code = raw.includes("/") ? raw.split("/").pop()! : raw;

    setLoading(true);
    try {
      const { data } = await desktopApi.getAssessmentByCode(code);
      setAssessmentTitle(data.data.title);
      setOrgName(data.data.organization?.name ?? "");
      setTestCode(code);
      setStep("credentials");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Invalid test code. Please check and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 2: Candidate login ─────────────────────────────────────────────
  async function handleLogin() {
    setError("");
    if (!password) { setError("Password is required."); return; }
    if (!email && !rollNumber) { setError("Email or roll number is required."); return; }

    setLoading(true);
    try {
      const { data } = await desktopApi.login({
        email: email || undefined,
        rollNumber: rollNumber || undefined,
        password,
        testCode,
      });

      if (!data.accessToken) {
        setError("Login succeeded but no session token was returned. Please try again.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("examToken", data.accessToken);
      }

      setAuth(data.accessToken, data.data.candidate);
      setAssessment(data.data.assessment, data.data.questions);

      router.push("/pre-exam");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Top bar */}
      <div
        className="flex h-9 items-center px-4 border-b border-white/10 select-none"
        data-tauri-drag-region
      >
        <span className="text-xs font-bold tracking-widest text-white/40 uppercase">
          enum
        </span>
        <span className="ml-auto text-xs text-white/30">Secure Exam Client</span>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-white">
              {step === "link" ? "Join Assessment" : assessmentTitle}
            </h1>
            {step === "credentials" && (
              <p className="mt-1 text-sm text-gray-400">{orgName}</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {step === "link" ? (
            /* ── Step 1 ─ Enter test code ── */
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                  Test Code or Assessment Link
                </label>
                <input
                  type="text"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                  placeholder="abc12345 or https://enum.live/test/abc12345"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none ring-0 focus:border-white/30 focus:bg-white/10 transition-all"
                  autoFocus
                />
              </div>
              <button
                onClick={handleValidateCode}
                disabled={loading}
                className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-black transition-all hover:bg-gray-100 disabled:opacity-50"
              >
                {loading ? "Validating…" : "Continue"}
              </button>
            </div>
          ) : (
            /* ── Step 2 ─ Candidate credentials ── */
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="flex-1 border-t border-white/10" />
                <span>or</span>
                <div className="flex-1 border-t border-white/10" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 2021CS001"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setStep("link"); setError(""); }}
                  className="flex-1 rounded-lg border border-white/10 py-3 text-sm text-gray-400 transition-all hover:border-white/30 hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-white py-3 text-sm font-semibold text-black transition-all hover:bg-gray-100 disabled:opacity-50"
                >
                  {loading ? "Authenticating…" : "Start Exam"}
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-gray-600">
            ENUM Secure Desktop Client — All activity is monitored
          </p>
        </div>
      </div>
    </div>
  );
}
