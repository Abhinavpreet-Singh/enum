"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

type AuthMode = "login" | "register";
type RegisterStep = "form" | "otp";
type AccountType = "user" | "organization" | "admin";

interface AuthFormProps {
  initialMode?: AuthMode;
  initialReturnTo?: string;
}

export default function AuthForm({
  initialMode = "login",
  initialReturnTo = "/dashboard",
}: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [accountType, setAccountType] = useState<AccountType>("user");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [otpValue, setOtpValue] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");

  // Login form (shared, no type selector)
  const [loginForm, setLoginForm] = useState({
    identifier: "", // email or username
    password: "",
  });

  // User register fields
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  // organization register fields
  const [organizationForm, setorganizationForm] = useState({
    name: "",
    email: "",
    password: "",
    website: "",
    industry: "",
    size: "",
    location: "",
    description: "",
  });

  const returnTo = initialReturnTo || "/dashboard";

  const resetRegister = () => {
    setRegisterStep("form");
    setOtpValue("");
    setOtpSentTo("");
    setError("");
    setSuccess("");
  };

  const switchAccountType = (type: AccountType) => {
    setAccountType(type);
    resetRegister();
    setError("");
    setSuccess("");
  };

  const startOAuth = (provider: "google" | "github") => {
    setError("");
    setIsLoading(true);
    const successRedirect = `${window.location.origin}/oauth-success?returnTo=${encodeURIComponent(returnTo)}`;
    const failureRedirect = `${window.location.origin}/login?error=${provider}_auth_failed`;
    const url = new URL(`/auth/${provider}`, proxy);

    url.searchParams.set("redirect", successRedirect);
    url.searchParams.set("redirect_uri", successRedirect);
    url.searchParams.set("successRedirect", successRedirect);
    url.searchParams.set("failureRedirect", failureRedirect);

    window.location.assign(url.toString());
  };

  // ── OTP Send ────────────────────────────────────────────────────────────────

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const email =
      accountType === "user" ? userForm.email
      : organizationForm.email
    const endpoint =
      accountType === "user"
        ? `${proxy}/api/v1/users/send-otp`
        : `${proxy}/api/v1/companies/send-otp`

    try {
      await axios.post(endpoint, { email });
      setOtpSentTo(email);
      setRegisterStep("otp");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const raw =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message;
        const lower = raw?.toLowerCase() || "";
        if (lower.includes("already exists") || err.response?.status === 409) {
          setError("An account with this email already exists. Please log in.");
        } else {
          setError(raw || "Failed to send OTP. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP Verify + Register ───────────────────────────────────────────────────

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      let response;

      if (accountType === "user") {
        response = await axios.post(
          `${proxy}/api/v1/users/register`,
          {
            username: userForm.username,
            email: userForm.email,
            password: userForm.password,
            otp: otpValue,
          },
          { withCredentials: true },
        );
        localStorage.setItem("Name", response.data.data.username);
        localStorage.setItem(
          "id",
          response.data.data.id ?? response.data.data._id,
        );
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("accountType", "user");
      } else if (accountType === "organization") {
        response = await axios.post(
          `${proxy}/api/v1/companies/register`,
          {
            name: organizationForm.name,
            email: organizationForm.email,
            password: organizationForm.password,
            otp: otpValue,
            website: organizationForm.website,
            industry: organizationForm.industry,
            size: organizationForm.size,
            location: organizationForm.location,
            description: organizationForm.description,
          },
          { withCredentials: true },
        );

        setIsLoading(false);
        setMode("login");
        resetRegister();
        setSuccess(
          response.data.message ||
            "Your organization has been registered and is pending admin approval. You can log in once an admin approves your account.",
        );
        return;
      }

      router.push(returnTo);
    } catch (err) {
      setIsLoading(false);
      if (axios.isAxiosError(err)) {
        const raw =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message;
        const lower = raw?.toLowerCase() || "";
        if (lower.includes("invalid otp") || lower.includes("invalid o")) {
          setError("Invalid OTP. Please check and try again.");
        } else if (lower.includes("expired")) {
          setError("OTP has expired. Please go back and request a new one.");
        } else if (
          lower.includes("already exists") ||
          err.response?.status === 409
        ) {
          setError("This account already exists! Please log in to continue.");
        } else {
          setError(raw || "Registration failed. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  // ── Login (unified – backend auto-detects user vs organization) ─────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const isEmail = loginForm.identifier.includes("@");
      const payload = {
        ...(isEmail
          ? { email: loginForm.identifier }
          : { username: loginForm.identifier.toLowerCase() }),
        password: loginForm.password,
      };

      const response = await axios.post(
        `${proxy}/api/v1/auth/login`,
        payload,
        { withCredentials: true },
      );

      const detectedType: AccountType = response.data.accountType ?? "user";
      localStorage.setItem("accountType", detectedType);
      localStorage.setItem(
        "Name",
        detectedType === "organization"
          && response.data.data.name
      );
      localStorage.setItem(
        "id",
        response.data.data.id ?? response.data.data._id,
      );
      localStorage.setItem("accessToken", response.data.accessToken);
      router.push(returnTo);
    } catch (err) {
      setIsLoading(false);
      if (axios.isAxiosError(err)) {
        const raw =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message;
        const lower = raw?.toLowerCase() || "";
        if (lower.includes("pending") || lower.includes("awaiting approval")) {
          setError(
            "Your organization account is pending admin approval. You'll be able to log in once an admin approves your registration.",
          );
        } else if (lower.includes("rejected")) {
          setError(
            "Your organization registration was rejected. Please contact support if you believe this is an error.",
          );
        } else if (lower.includes("password") || lower.includes("credential")) {
          setError("Invalid email/username or password. Please try again.");
        } else if (
          lower.includes("not found") ||
          lower.includes("doesn't exist")
        ) {
          setError(
            "No account found. Please check your email/username or register first.",
          );
        } else {
          setError(
            "Login failed. Please check your credentials and try again.",
          );
        }
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
    }
  };

  const handleSubmit =
    mode === "login"
      ? handleLogin
      : registerStep === "form"
        ? handleSendOtp
        : handleVerifyAndRegister;

  // ── Shared input class ──────────────────────────────────────────────────────

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors";

  const labelCls =
    "block font-mono text-xs tracking-wider text-gray-700 dark:text-neutral-400 mb-1";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-black overflow-hidden">
      {/* Grid Background – light */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            color: "#000",
          }}
        />
      </div>
      {/* Grid Background – dark */}
      <div className="absolute inset-0 opacity-[0.15] dark:block hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            color: "#ffffff",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-4">
          <Link href="/" className="inline-block">
            <h1
              className="font-bold text-[40px] leading-none text-black dark:text-white flex justify-center"
              style={{ letterSpacing: "-0.08em", transform: "scaleX(0.9)" }}
            >
              <span>E</span>
              <span className="italic font-medium">N</span>
              <span>U</span>
              <span>M</span>
            </h1>
          </Link>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-neutral-950 border border-gray-300 dark:border-white p-6">
          {/* LOGIN / REGISTER tab toggle */}
          <div className="flex mb-3 border-b border-gray-200 dark:border-neutral-800">
            <button
              id="auth-login-tab"
              onClick={() => {
                setMode("login");
                resetRegister();
                setSuccess("");
              }}
              className={`flex-1 pb-2 font-mono text-xs tracking-wider transition-colors ${
                mode === "login"
                  ? "text-black dark:text-white border-b-2 border-black dark:border-white"
                  : "text-gray-400 dark:text-neutral-600"
              }`}
            >
              LOGIN
            </button>
            <button
              id="auth-register-tab"
              onClick={() => {
                setMode("register");
                resetRegister();
                setSuccess("");
              }}
              className={`flex-1 pb-2 font-mono text-xs tracking-wider transition-colors ${
                mode === "register"
                  ? "text-black dark:text-white border-b-2 border-black dark:border-white"
                  : "text-gray-400 dark:text-neutral-600"
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Account-type selector – register only */}
          {mode === "register" && (
            <div className="flex mb-3 gap-0">
              {(["user", "organization"] as const).map((type, i) => (
                <button
                  key={type}
                  id={`auth-type-${type}`}
                  type="button"
                  onClick={() => switchAccountType(type)}
                  className={`flex-1 py-1.5 font-mono text-[11px] tracking-wider border transition-colors ${
                    i > 0 ? "border-l-0" : ""
                  } ${
                    accountType === type
                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                      : "bg-white dark:bg-neutral-950 text-gray-500 dark:text-neutral-500 border-gray-300 dark:border-neutral-700 hover:border-gray-500 dark:hover:border-neutral-500"
                  }`}
                >
                  {type === "user" ? "STUDENT" : type.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* OAuth – only shown for user register or on login tab */}
          {(mode === "login" || (mode === "register" && (accountType === "user"))) && (
            <div className="mb-3">
              <div className="space-y-2">
                <button
                  id="auth-google-btn"
                  type="button"
                  onClick={() => startOAuth("google")}
                  disabled={isLoading}
                  className="w-full border border-gray-300 dark:border-white px-3 py-2 font-mono text-xs tracking-wider text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-60"
                >
                  CONTINUE WITH GOOGLE
                </button>
                <button
                  id="auth-github-btn"
                  type="button"
                  onClick={() => startOAuth("github")}
                  disabled={isLoading}
                  className="w-full border border-gray-300 dark:border-white px-3 py-2 font-mono text-xs tracking-wider text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-60"
                >
                  CONTINUE WITH GITHUB
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
                <span className="font-mono text-[10px] tracking-wider text-gray-400 dark:text-neutral-600">
                  OR
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
              </div>
            </div>
          )}

          {/* Account type banner */}
          {mode === "register" && accountType === "organization" && (
            <div className="mb-3 px-3 py-2 border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
              <p className="font-mono text-[10px] tracking-wider text-gray-500 dark:text-neutral-400">
                ORGANIZATION ACCOUNT · Requires admin approval before dashboard access
              </p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-3 p-3 border border-green-300 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
              <p className="text-xs font-mono text-green-700 dark:text-green-400 leading-relaxed">
                {success}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-3 p-3 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
              <p className="text-xs font-mono text-red-700 dark:text-red-400 leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {/* OTP Step */}
          {mode === "register" && registerStep === "otp" ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="mb-2">
                <p className="text-xs font-mono text-gray-500 dark:text-neutral-400 leading-relaxed">
                  A 6-digit code was sent to{" "}
                  <span className="text-black dark:text-white">{otpSentTo}</span>
                  . Enter it below to verify your email.
                </p>
              </div>
              <div>
                <label htmlFor="otp" className={labelCls}>
                  VERIFICATION CODE
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otpValue}
                  onChange={(e) =>
                    setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className={`${inputCls} tracking-[0.5em] text-center`}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || otpValue.length !== 6}
                className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors mt-3 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <SpinnerIcon />}
                {isLoading ? "VERIFYING..." : "VERIFY & CREATE ACCOUNT"}
              </button>
              <button
                type="button"
                onClick={resetRegister}
                className="w-full text-center text-xs font-mono text-gray-500 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors mt-1"
              >
                ← Back / Resend OTP
              </button>
            </form>
          ) : (
            /* Login OR Register step-1 form */
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* ── USER REGISTER FIELDS ── */}
              {mode === "register" && accountType === "user" && (
                <div>
                  <label htmlFor="username" className={labelCls}>
                    USERNAME
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm({ ...userForm, username: e.target.value })
                    }
                    className={inputCls}
                    placeholder="Username"
                    required
                  />
                </div>
              )}

              {/* ── organization REGISTER FIELDS ── */}
              {mode === "register" && accountType === "organization" && (
                <>
                  <div>
                    <label htmlFor="organization-name" className={labelCls}>
                      ORGANIZATION NAME
                    </label>
                    <input
                      type="text"
                      id="organization-name"
                      value={organizationForm.name}
                      onChange={(e) =>
                        setorganizationForm({ ...organizationForm, name: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Acme Inc."
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="organization-website" className={labelCls}>
                      WEBSITE
                    </label>
                    <input
                      type="url"
                      id="organization-website"
                      value={organizationForm.website}
                      onChange={(e) =>
                        setorganizationForm({ ...organizationForm, website: e.target.value })
                      }
                      className={inputCls}
                      placeholder="https://yourorganization.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="organization-industry" className={labelCls}>
                        INDUSTRY
                      </label>
                      <input
                        type="text"
                        id="organization-industry"
                        value={organizationForm.industry}
                        onChange={(e) =>
                          setorganizationForm({ ...organizationForm, industry: e.target.value })
                        }
                        className={inputCls}
                        placeholder="Software"
                      />
                    </div>
                    <div>
                      <label htmlFor="organization-size" className={labelCls}>
                        ORGANIZATION SIZE
                      </label>
                      <select
                        id="organization-size"
                        value={organizationForm.size}
                        onChange={(e) =>
                          setorganizationForm({ ...organizationForm, size: e.target.value })
                        }
                        className={`${inputCls} appearance-none`}
                      >
                        <option value="">Select</option>
                        <option value="1-10">1 – 10</option>
                        <option value="11-50">11 – 50</option>
                        <option value="51-200">51 – 200</option>
                        <option value="201-500">201 – 500</option>
                        <option value="500+">500+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="organization-location" className={labelCls}>
                      LOCATION
                    </label>
                    <input
                      type="text"
                      id="organization-location"
                      value={organizationForm.location}
                      onChange={(e) =>
                        setorganizationForm({ ...organizationForm, location: e.target.value })
                      }
                      className={inputCls}
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div>
                    <label htmlFor="organization-description" className={labelCls}>
                      DESCRIPTION
                    </label>
                    <textarea
                      id="organization-description"
                      value={organizationForm.description}
                      onChange={(e) =>
                        setorganizationForm({ ...organizationForm, description: e.target.value })
                      }
                      className={`${inputCls} resize-none`}
                      rows={2}
                      placeholder="Brief description of your organization…"
                    />
                  </div>
                </>
              )}

              {/* ── LOGIN FIELDS (unified) ── */}
              {mode === "login" ? (
                <>
                  <div>
                    <label htmlFor="login-identifier" className={labelCls}>
                      USERNAME OR EMAIL
                    </label>
                    <input
                      type="text"
                      id="login-identifier"
                      value={loginForm.identifier}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, identifier: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Username or Email"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="login-password" className={labelCls}>
                      PASSWORD
                    </label>
                    <input
                      type="password"
                      id="login-password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Password"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* ── REGISTER EMAIL FIELD ── */}
                  <div>
                    <label htmlFor="email" className={labelCls}>
                      EMAIL
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={
                        accountType === "user" ? userForm.email
                        : organizationForm.email
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (accountType === "user") setUserForm({ ...userForm, email: v });
                        else if (accountType === "organization") setorganizationForm({ ...organizationForm, email: v });;
                      }}
                      className={inputCls}
                      placeholder="Email"
                      required
                    />
                  </div>

                  {/* ── REGISTER PASSWORD FIELD ── */}
                  <div>
                    <label htmlFor="password" className={labelCls}>
                      PASSWORD
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={
                        accountType === "user" ? userForm.password
                        : organizationForm.password
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (accountType === "user") setUserForm({ ...userForm, password: v });
                        else if (accountType === "organization") setorganizationForm({ ...organizationForm, password: v });
                      }}
                      className={inputCls}
                      placeholder="Password"
                      required
                    />
                  </div>
                </>
              )}

              {/* ── SUBMIT ── */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors mt-3 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <SpinnerIcon />}
                {isLoading
                  ? mode === "login"
                    ? "LOGGING IN..."
                    : "SENDING OTP..."
                  : mode === "login"
                    ? "LOGIN"
                    : "SEND OTP"}
              </button>
            </form>
          )}

          {/* Footer */}
          {mode === "login" ? (
            <p className="text-center mt-3 text-xs text-gray-600 dark:text-neutral-400">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setMode("register");
                  resetRegister();
                }}
                className="text-black dark:text-white font-mono tracking-wider underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-center mt-3 text-xs text-gray-600 dark:text-neutral-400">
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("login");
                  resetRegister();
                }}
                className="text-black dark:text-white font-mono tracking-wider underline"
              >
                Log in
              </button>
            </p>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-3">
          <Link
            href="/"
            className="text-xs text-gray-600 dark:text-neutral-500 hover:text-black dark:hover:text-white font-mono tracking-wider transition-colors"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
