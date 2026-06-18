"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

type PasswordResetMode = "request" | "confirm";
type AccountType = "user" | "organization";

interface PasswordResetFormProps {
  mode: PasswordResetMode;
  token?: string;
}

export default function PasswordResetForm({ mode, token }: PasswordResetFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("user");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputCls =
    "w-full px-3 py-1.5 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white font-mono text-[13px] focus:outline-none focus:border-black dark:focus:border-white transition-colors";

  const labelCls =
    "block font-mono text-[11px] tracking-wider text-gray-700 dark:text-neutral-400 mb-1";

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${proxy}/api/v1/auth/password-reset/request`, {
        email,
        accountType,
      });
      setSuccess(
        response.data.message ||
          "If an account exists for this email, a password reset link has been sent.",
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Could not send reset email. Please try again.",
        );
      } else {
        setError("Could not send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!token) {
      setError("Reset link is missing a token. Please request a new link.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${proxy}/api/v1/auth/password-reset/confirm`, {
        token,
        newPassword,
      });
      setSuccess(
        response.data.message ||
          "Password reset successfully. Redirecting you to login...",
      );
      window.setTimeout(() => {
        router.push("/login?reset=success");
      }, 1400);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Could not reset password. Please request a new link.",
        );
      } else {
        setError("Could not reset password. Please request a new link.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-4 bg-gray-50 dark:bg-black overflow-hidden">
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

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-3">
          <Link href="/" className="inline-block">
            <h1
              className="font-bold text-[36px] leading-none text-black dark:text-white flex justify-center"
              style={{ letterSpacing: "-0.08em", transform: "scaleX(0.9)" }}
            >
              <span>E</span>
              <span className="italic font-medium">N</span>
              <span>U</span>
              <span>M</span>
            </h1>
          </Link>
        </div>

        <div className="max-h-[calc(100vh-6.5rem)] bg-white dark:bg-neutral-950 border border-gray-300 dark:border-white p-5 sm:p-6 overflow-y-auto">
          <div className="mb-4">
            <p className="font-mono text-[11px] tracking-[0.25em] text-gray-500 dark:text-neutral-500 uppercase mb-2">
              {mode === "request" ? "Reset Password" : "New Password"}
            </p>
            <h2 className="text-xl font-semibold text-black dark:text-white">
              {mode === "request" ? "Reset your password" : "Create a new password"}
            </h2>
            <p className="mt-2 text-[13px] text-gray-600 dark:text-neutral-400 leading-relaxed">
              {mode === "request"
                ? "Enter your account email and we will send a secure reset link."
                : "Enter a new password for your ENUM account."}
            </p>
          </div>

          {success && (
            <div className="mb-3 p-2 border border-green-300 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
              <p className="text-xs font-mono text-green-700 dark:text-green-400 leading-relaxed">
                {success}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-3 p-2 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
              <p className="text-xs font-mono text-red-700 dark:text-red-400 leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {mode === "request" ? (
            <form onSubmit={handleRequest} className="space-y-3">
              <div className="flex gap-0">
                {(["user", "organization"] as const).map((type, i) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={`flex-1 py-1.5 font-mono text-[10px] tracking-wider border transition-colors ${
                      i > 0 ? "border-l-0" : ""
                    } ${
                      accountType === type
                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                        : "bg-white dark:bg-neutral-950 text-gray-500 dark:text-neutral-500 border-gray-300 dark:border-neutral-700 hover:border-gray-500 dark:hover:border-neutral-500"
                    }`}
                  >
                    {type === "user" ? "STUDENT" : "ORGANIZATION"}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="reset-email" className={labelCls}>
                  EMAIL
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputCls}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <SpinnerIcon />}
                {isLoading ? "SENDING LINK..." : "SEND RESET LINK"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-3">
              <div>
                <label htmlFor="new-password" className={labelCls}>
                  NEW PASSWORD
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={inputCls}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className={labelCls}>
                  CONFIRM PASSWORD
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputCls}
                  placeholder="Re-enter password"
                  minLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <SpinnerIcon />}
                {isLoading ? "SAVING..." : "SAVE NEW PASSWORD"}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-3">
          <Link
            href="/login"
            className="text-xs text-gray-600 dark:text-neutral-500 hover:text-black dark:hover:text-white font-mono tracking-wider transition-colors"
          >
            BACK TO LOGIN
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
