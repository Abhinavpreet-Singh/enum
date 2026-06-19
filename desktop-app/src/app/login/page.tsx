"use client";

import { useEffect, useState } from "react";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined" ? localStorage.getItem("enum_theme") : null;
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    setThemeMode(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextTheme);
    localStorage.setItem("enum_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  async function handleValidateCode() {
    setError("");
    const raw = testCode.trim();
    if (!raw) { setError("Please enter a test code or assessment link."); return; }

    const code = raw.includes("/") ? raw.split("/").pop()! : raw;

    setLoading(true);
    try {
      const { data } = await desktopApi.getAssessmentByCode(code);
      setAssessmentTitle(data.data.title);
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
    if (!email) { setError("Email is required."); return; }

    setLoading(true);
    try {
      const { data } = await desktopApi.login({
        email,
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
    <div className="relative flex h-screen flex-col overflow-hidden bg-white text-[#0a0a0a] dark:bg-black dark:text-white">
      {/* Ambient glow + grid texture */}
      <div className="pointer-events-none fixed inset-0 enum-glow" />
      <div className="pointer-events-none fixed inset-0 enum-grid-bg" />

      {/* Top title bar */}
      <div
        className="relative z-10 flex h-12 shrink-0 items-center gap-3 border-b border-black/10 bg-white/90 px-4 select-none backdrop-blur-xl dark:border-white/10 dark:bg-black/90"
        data-tauri-drag-region
      >
        <EnumLogo />
        <BrandText />
        <button
          type="button"
          onClick={toggleTheme}
          className="ml-auto rounded border border-black/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-gray-600 transition-colors hover:border-black/30 hover:text-black dark:border-white/10 dark:text-gray-400 dark:hover:border-white/30 dark:hover:text-white"
        >
          {themeMode === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-slide-up">

          {/* Wordmark */}
          <div className="mb-7 text-center">
            <div className="mb-3 flex justify-center">
              <EnumWordmark />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#0a0a0a] dark:text-white">
                {step === "link" ? "Join Assessment" : assessmentTitle}
              </h1>
            </div>
          </div>

          {/* Card */}
          <div className="enum-card p-7 backdrop-blur-sm">
            {/* Error banner */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200">
                <span className="mt-0.5 shrink-0">!</span>
                <span>{error}</span>
              </div>
            )}

            {step === "link" ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
                    Test Code or Assessment Link
                  </label>
                  <input
                    type="text"
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                    placeholder="abc12345 or https://exam.enum.live/test/..."
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
              <div className="space-y-5">
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

          <p className="mt-6 text-center font-mono text-xs tracking-[0.12em] text-gray-400">
            All activity is monitored and recorded
          </p>
        </div>
      </div>
    </div>
  );
}

function EnumLogo({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[#0a0a0a] dark:text-white">
      <img
        src="/lgogo.png"
        alt="Enum logo"
        className={`${large ? "h-10 w-10" : "h-7 w-7"} shrink-0 object-contain`}
      />
    </div>
  );
}

function BrandText() {
  return (
    <div className="leading-none text-[#0a0a0a] dark:text-white">
      <span
        className="inline-flex select-none items-center text-[20px] font-bold leading-none"
        style={{ letterSpacing: "-0.085em", transform: "scaleX(0.9)", transformOrigin: "left" }}
      >
        <span>E</span>
        <span className="font-medium italic">N</span>
        <span>U</span>
        <span>M</span>
      </span>
      <p className="mt-1 font-mono text-[8px] font-semibold uppercase tracking-[0.24em] text-gray-400">
        EXAM CLIENT
      </p>
    </div>
  );
}

function EnumWordmark() {
  return (
    <span
      className="inline-flex select-none items-center text-[42px] font-bold leading-none text-[#0a0a0a] dark:text-white"
      style={{ letterSpacing: "-0.085em", transform: "scaleX(0.9)" }}
    >
      <span>E</span>
      <span className="font-medium italic">N</span>
      <span>U</span>
      <span>M</span>
    </span>
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
