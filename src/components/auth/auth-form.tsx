"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

type AuthMode = "login" | "register";
type RegisterStep = "form" | "otp";

interface AuthFormProps {
  initialMode?: AuthMode;
}

export default function AuthForm({ initialMode = "login" }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [otpValue, setOtpValue] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const resetRegister = () => {
    setRegisterStep("form");
    setOtpValue("");
    setOtpSentTo("");
    setError("");
  };

  const startOAuth = (provider: "google" | "github") => {
    setError("");
    setIsLoading(true);
    const successRedirect = `${window.location.origin}/auth/success`;
    const failureRedirect = `${window.location.origin}/login?error=${provider}_auth_failed`;
    const url = new URL(`/auth/${provider}`, proxy);

    // Different backend implementations use different query key names.
    url.searchParams.set("redirect", successRedirect);
    url.searchParams.set("redirect_uri", successRedirect);
    url.searchParams.set("successRedirect", successRedirect);
    url.searchParams.set("failureRedirect", failureRedirect);

    window.location.assign(url.toString());
  };

  // Step 1 for register: send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await axios.post(`${proxy}/api/v1/users/send-otp`, {
        email: formData.email,
      });
      setOtpSentTo(formData.email);
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

  // Step 2 for register: verify OTP and create account
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${proxy}/api/v1/users/register`,
        {
          username: formData.username,
          email: formData.email,
          password: formData.password,
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
      router.push("/dashboard");
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
          setError("You're already a user! Please log in to continue.");
        } else {
          setError(raw || "Registration failed. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  // Login submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const isEmail = formData.email.includes("@");
      const payload = {
        ...(isEmail
          ? { email: formData.email }
          : { username: formData.email.toLowerCase() }),
        password: formData.password,
      };

      const response = await axios.post(
        `${proxy}/api/v1/users/login`,
        payload,
        {
          withCredentials: true,
        },
      );

      localStorage.setItem("Name", response.data.data.username);
      localStorage.setItem(
        "id",
        response.data.data.id ?? response.data.data._id,
      );
      localStorage.setItem("accessToken", response.data.accessToken);
      router.push("/dashboard");
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

  return (
    <div className="relative h-screen w-full flex items-center justify-center px-4 py-4 bg-gray-50 dark:bg-black overflow-hidden">
      {/* Grid Background */}
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
        {/* Logo/Brand */}
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
          {/* Mode Toggle */}
          <div className="flex mb-3 border-b border-gray-200 dark:border-neutral-800">
            <button
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

          {/* OAuth */}
          <div className="mb-3">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => startOAuth("google")}
                disabled={isLoading}
                className="w-full border border-gray-300 dark:border-white px-3 py-2 font-mono text-xs tracking-wider text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-60"
              >
                CONTINUE WITH GOOGLE
              </button>
              <button
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

          {/* Error Message */}
          {error && (
            <div className="mb-3 p-3 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
              <p className="text-xs font-mono text-red-700 dark:text-red-400 leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {/* OTP Step — shown only during register step 2 */}
          {mode === "register" && registerStep === "otp" ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="mb-2">
                <p className="text-xs font-mono text-gray-500 dark:text-neutral-400 leading-relaxed">
                  A 6-digit code was sent to{" "}
                  <span className="text-black dark:text-white">
                    {otpSentTo}
                  </span>
                  . Enter it below to verify your email.
                </p>
              </div>
              <div>
                <label
                  htmlFor="otp"
                  className="block font-mono text-xs tracking-wider text-gray-700 dark:text-neutral-400 mb-1"
                >
                  VERIFICATION CODE
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otpValue}
                  onChange={(e) =>
                    setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors tracking-[0.5em] text-center"
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
                {isLoading && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                )}
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
            /* Login form OR Register step 1 form */
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Username - Only for Register */}
              {mode === "register" && (
                <div>
                  <label
                    htmlFor="username"
                    className="block font-mono text-xs tracking-wider text-gray-700 dark:text-neutral-400 mb-1"
                  >
                    USERNAME
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    placeholder="Username"
                    required
                  />
                </div>
              )}

              {/* Email or Username */}
              <div>
                <label
                  htmlFor="email"
                  className="block font-mono text-xs tracking-wider text-gray-700 dark:text-neutral-400 mb-1"
                >
                  {mode === "login" ? "USERNAME OR EMAIL" : "EMAIL"}
                </label>
                <input
                  type={mode === "login" ? "text" : "email"}
                  id="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder={mode === "login" ? "Username or Email" : "Email"}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block font-mono text-xs tracking-wider text-gray-700 dark:text-neutral-400 mb-1"
                >
                  PASSWORD
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder="Password"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors mt-3 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
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

          {/* Footer Text */}
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
