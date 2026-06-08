"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

type AuthMode = "login" | "register";
type RegisterStep = "form" | "otp";
type AccountType = "user" | "company" | "college" | "recruiter";

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

  // Company register fields
  const [companyForm, setCompanyForm] = useState({
    name: "",
    email: "",
    password: "",
    website: "",
    industry: "",
    size: "",
    location: "",
    description: "",
  });

  // College register fields
  const [collegeForm, setCollegeForm] = useState({
    name: "",
    email: "",
    password: "",
    website: "",
    coordinatorName: "",
    coordinatorEmail: "",
  });

  // Recruiter register fields (uses User model with accountRole)
  const [recruiterForm, setRecruiterForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const returnTo = initialReturnTo || "/dashboard";

  const resetRegister = () => {
    setRegisterStep("form");
    setOtpValue("");
    setOtpSentTo("");
    setError("");
  };

  const switchAccountType = (type: AccountType) => {
    setAccountType(type);
    resetRegister();
    setError("");
  };

  const startOAuth = (provider: "google" | "github") => {
    setError("");
    setIsLoading(true);
    const successRedirect = `${window.location.origin}/auth/success?returnTo=${encodeURIComponent(returnTo)}`;
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

    const email =
      accountType === "user" ? userForm.email
      : accountType === "company" ? companyForm.email
      : accountType === "college" ? collegeForm.email
      : recruiterForm.email;
    const endpoint =
      accountType === "user" || accountType === "recruiter"
        ? `${proxy}/api/v1/users/send-otp`
        : accountType === "company"
          ? `${proxy}/api/v1/companies/send-otp`
          : `${proxy}/api/v1/colleges/send-otp`;

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
      } else if (accountType === "company") {
        response = await axios.post(
          `${proxy}/api/v1/companies/register`,
          {
            name: companyForm.name,
            email: companyForm.email,
            password: companyForm.password,
            otp: otpValue,
            website: companyForm.website,
            industry: companyForm.industry,
            size: companyForm.size,
            location: companyForm.location,
            description: companyForm.description,
          },
          { withCredentials: true },
        );
        localStorage.setItem("Name", response.data.data.name);
        localStorage.setItem(
          "id",
          response.data.data.id ?? response.data.data._id,
        );
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("accountType", "company");
      } else if (accountType === "college") {
        response = await axios.post(
          `${proxy}/api/v1/colleges/register`,
          {
            name: collegeForm.name,
            email: collegeForm.email,
            password: collegeForm.password,
            otp: otpValue,
            website: collegeForm.website,
            coordinatorName: collegeForm.coordinatorName,
            coordinatorEmail: collegeForm.coordinatorEmail,
          },
          { withCredentials: true },
        );
        localStorage.setItem("Name", response.data.data.name);
        localStorage.setItem(
          "id",
          response.data.data.id ?? response.data.data._id,
        );
        localStorage.setItem("accessToken", response.data.accessToken || "");
        localStorage.setItem("accountType", "college");
      } else {
        // recruiter — uses user registration endpoint
        response = await axios.post(
          `${proxy}/api/v1/users/register`,
          {
            username: recruiterForm.username,
            email: recruiterForm.email,
            password: recruiterForm.password,
            otp: otpValue,
            accountRole: "recruiter",
          },
          { withCredentials: true },
        );
        localStorage.setItem("Name", response.data.data.username);
        localStorage.setItem(
          "id",
          response.data.data.id ?? response.data.data._id,
        );
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("accountType", "recruiter");
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

  // ── Login (unified – backend auto-detects user vs company) ─────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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
        detectedType === "company"
          ? response.data.data.name
          : detectedType === "college"
            ? response.data.data.name
            : response.data.data.username,
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
        if (lower.includes("password") || lower.includes("credential")) {
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
              {(["user", "company", "college", "recruiter"] as const).map((type, i) => (
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

          {/* OAuth – only shown for user/recruiter register or on login tab */}
          {(mode === "login" || (mode === "register" && (accountType === "user" || accountType === "recruiter"))) && (
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
          {mode === "register" && accountType === "company" && (
            <div className="mb-3 px-3 py-2 border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
              <p className="font-mono text-[10px] tracking-wider text-gray-500 dark:text-neutral-400">
                COMPANY ACCOUNT · Post tests & access hiring tools
              </p>
            </div>
          )}
          {mode === "register" && accountType === "college" && (
            <div className="mb-3 px-3 py-2 border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
              <p className="font-mono text-[10px] tracking-wider text-gray-500 dark:text-neutral-400">
                COLLEGE ACCOUNT · Manage exams & student assessments
              </p>
            </div>
          )}
          {mode === "register" && accountType === "recruiter" && (
            <div className="mb-3 px-3 py-2 border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
              <p className="font-mono text-[10px] tracking-wider text-gray-500 dark:text-neutral-400">
                RECRUITER ACCOUNT · Search candidates & view reports
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

              {/* ── COMPANY REGISTER FIELDS ── */}
              {mode === "register" && accountType === "company" && (
                <>
                  <div>
                    <label htmlFor="company-name" className={labelCls}>
                      COMPANY NAME
                    </label>
                    <input
                      type="text"
                      id="company-name"
                      value={companyForm.name}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, name: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Acme Inc."
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="company-website" className={labelCls}>
                      WEBSITE
                    </label>
                    <input
                      type="url"
                      id="company-website"
                      value={companyForm.website}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, website: e.target.value })
                      }
                      className={inputCls}
                      placeholder="https://yourcompany.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="company-industry" className={labelCls}>
                        INDUSTRY
                      </label>
                      <input
                        type="text"
                        id="company-industry"
                        value={companyForm.industry}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, industry: e.target.value })
                        }
                        className={inputCls}
                        placeholder="Software"
                      />
                    </div>
                    <div>
                      <label htmlFor="company-size" className={labelCls}>
                        COMPANY SIZE
                      </label>
                      <select
                        id="company-size"
                        value={companyForm.size}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, size: e.target.value })
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
                    <label htmlFor="company-location" className={labelCls}>
                      LOCATION
                    </label>
                    <input
                      type="text"
                      id="company-location"
                      value={companyForm.location}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, location: e.target.value })
                      }
                      className={inputCls}
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div>
                    <label htmlFor="company-description" className={labelCls}>
                      DESCRIPTION
                    </label>
                    <textarea
                      id="company-description"
                      value={companyForm.description}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, description: e.target.value })
                      }
                      className={`${inputCls} resize-none`}
                      rows={2}
                      placeholder="Brief description of your company…"
                    />
                  </div>
                </>
              )}

              {/* ── COLLEGE REGISTER FIELDS ── */}
              {mode === "register" && accountType === "college" && (
                <>
                  <div>
                    <label htmlFor="college-name" className={labelCls}>
                      COLLEGE NAME
                    </label>
                    <input
                      type="text"
                      id="college-name"
                      value={collegeForm.name}
                      onChange={(e) =>
                        setCollegeForm({ ...collegeForm, name: e.target.value })
                      }
                      className={inputCls}
                      placeholder="MIT, Stanford, etc."
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="college-website" className={labelCls}>
                      WEBSITE
                    </label>
                    <input
                      type="url"
                      id="college-website"
                      value={collegeForm.website}
                      onChange={(e) =>
                        setCollegeForm({ ...collegeForm, website: e.target.value })
                      }
                      className={inputCls}
                      placeholder="https://college.edu"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="coordinator-name" className={labelCls}>
                        COORDINATOR NAME
                      </label>
                      <input
                        type="text"
                        id="coordinator-name"
                        value={collegeForm.coordinatorName}
                        onChange={(e) =>
                          setCollegeForm({ ...collegeForm, coordinatorName: e.target.value })
                        }
                        className={inputCls}
                        placeholder="Prof. Smith"
                      />
                    </div>
                    <div>
                      <label htmlFor="coordinator-email" className={labelCls}>
                        COORDINATOR EMAIL
                      </label>
                      <input
                        type="email"
                        id="coordinator-email"
                        value={collegeForm.coordinatorEmail}
                        onChange={(e) =>
                          setCollegeForm({ ...collegeForm, coordinatorEmail: e.target.value })
                        }
                        className={inputCls}
                        placeholder="coordinator@college.edu"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── RECRUITER REGISTER FIELDS ── */}
              {mode === "register" && accountType === "recruiter" && (
                <div>
                  <label htmlFor="recruiter-username" className={labelCls}>
                    USERNAME
                  </label>
                  <input
                    type="text"
                    id="recruiter-username"
                    value={recruiterForm.username}
                    onChange={(e) =>
                      setRecruiterForm({ ...recruiterForm, username: e.target.value })
                    }
                    className={inputCls}
                    placeholder="Username"
                    required
                  />
                </div>
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
                        : accountType === "company" ? companyForm.email
                        : accountType === "college" ? collegeForm.email
                        : recruiterForm.email
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (accountType === "user") setUserForm({ ...userForm, email: v });
                        else if (accountType === "company") setCompanyForm({ ...companyForm, email: v });
                        else if (accountType === "college") setCollegeForm({ ...collegeForm, email: v });
                        else setRecruiterForm({ ...recruiterForm, email: v });
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
                        : accountType === "company" ? companyForm.password
                        : accountType === "college" ? collegeForm.password
                        : recruiterForm.password
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (accountType === "user") setUserForm({ ...userForm, password: v });
                        else if (accountType === "company") setCompanyForm({ ...companyForm, password: v });
                        else if (accountType === "college") setCollegeForm({ ...collegeForm, password: v });
                        else setRecruiterForm({ ...recruiterForm, password: v });
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
