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

  async function handleValidateCode() {
    setError("");
    const raw = testCode.trim();
    if (!raw) { setError("Please enter a test code or assessment link."); return; }

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      {/* Ambient glow + grid texture */}
      <div className="pointer-events-none fixed inset-0 enum-glow" />
      <div className="pointer-events-none fixed inset-0 enum-grid-bg" />

      {/* Top title bar */}
      <div
        className="relative z-10 flex h-9 shrink-0 items-center gap-2 px-4 border-b border-black/8 select-none"
        data-tauri-drag-region
      >
        <span
          className="text-xs font-black text-gray-400 uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          enum
        </span>
        <span className="ml-auto text-xs text-gray-400 tracking-wide">Secure Exam Client</span>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-slide-up">

          {/* Logo mark */}
          <div className="mb-8 text-center">
            <div
              className="inline-block text-4xl font-black text-[#0a0a0a] mb-3"
              style={{ letterSpacing: "-0.05em", transform: "scaleX(0.92)", display: "inline-block" }}
            >
              enum
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#0a0a0a]">
                {step === "link" ? "Join Assessment" : assessmentTitle}
              </h1>
              {step === "credentials" && orgName && (
                <p className="mt-0.5 text-sm text-gray-500">{orgName}</p>
              )}
            </div>
          </div>

          {/* Card */}
          <div className="enum-card p-6 backdrop-blur-sm">
            {/* Error banner */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <span className="mt-0.5 shrink-0 text-red-500">✕</span>
                <span>{error}</span>
              </div>
            )}

            {step === "link" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
                    Test Code or Assessment Link
                  </label>
                  <input
                    type="text"
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                    placeholder="abc12345 or https://enum.live/test/…"
                    className="input-field"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleValidateCode}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner />
                      Validating…
                    </span>
                  ) : (
                    "Continue →"
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="input-field"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <div className="flex-1 border-t border-black/8" />
                  <span>or</span>
                  <div className="flex-1 border-t border-black/8" />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 2021CS001"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="••••••••"
                    className="input-field"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setStep("link"); setError(""); }}
                    className="btn-ghost flex-1"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner />
                        Authenticating…
                      </span>
                    ) : (
                      "Start Exam →"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400" style={{ letterSpacing: "0.03em" }}>
            All activity is monitored and recorded
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
