"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

type AuthMode = "login" | "register";

interface AuthFormProps {
  initialMode?: AuthMode;
}

export default function AuthForm({ initialMode = "login" }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting form...", { mode, email: formData.email });

    setIsLoading(true);
    setError("");

    try {
      const url =
        mode === "login"
          ? `${proxy}/api/v1/users/login`
          : `${proxy}/api/v1/users/register`;

      const isEmail = formData.email.includes("@");
      const payload =
        mode === "login"
          ? {
              ...(isEmail
                ? { email: formData.email }
                : { username: formData.email.toLowerCase() }),
              password: formData.password,
            }
          : {
              username: formData.username,
              email: formData.email,
              password: formData.password,
            };

      console.log("Request URL:", url);
      console.log("Request Payload:", { ...payload, password: "***" });

      const response = await axios.post(url, payload, {
        withCredentials: true,
      });

      localStorage.setItem("Name", response.data.data.username);
      localStorage.setItem(
        "id",
        response.data.data.id ?? response.data.data._id,
      );
      localStorage.setItem("accessToken", response.data.accessToken);

      console.log("✅ Success:", response.data);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      setIsLoading(false);

      if (axios.isAxiosError(error)) {
        console.error("❌ Error Response:", error.response?.data);
        console.error("Status:", error.response?.status);
        console.error("Full Error:", error.message);

        const rawError =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message;

        console.log("Raw error message:", rawError); // Debug log

        // Refined error messages
        let refinedError = "";

        if (mode === "register") {
          const lowerError = rawError?.toLowerCase() || "";

          // Check for username already exists
          if (
            lowerError.includes("username") &&
            (lowerError.includes("exist") ||
              lowerError.includes("taken") ||
              lowerError.includes("already") ||
              lowerError.includes("duplicate"))
          ) {
            refinedError =
              "This username is already taken. Please choose another one.";
          }
          // Check for email/user already exists - more comprehensive
          else if (
            (lowerError.includes("email") || lowerError.includes("user")) &&
            (lowerError.includes("exist") ||
              lowerError.includes("already") ||
              lowerError.includes("registered") ||
              lowerError.includes("duplicate") ||
              lowerError.includes("found"))
          ) {
            refinedError = "You're already a user! Please log in to continue.";
          }
          // Check for duplicate/conflict errors (HTTP 409 or similar)
          else if (
            lowerError.includes("duplicate") ||
            lowerError.includes("conflict") ||
            error.response?.status === 409
          ) {
            refinedError = "You're already a user! Please log in to continue.";
          }
          // Password validation errors
          else if (lowerError.includes("password")) {
            refinedError = "Password must be at least 6 characters long.";
          }
          // Generic fallback - assume user might already exist
          else if (
            error.response?.status === 400 ||
            error.response?.status === 409
          ) {
            refinedError =
              "Unable to register. If you already have an account, please log in to continue.";
          }
          // Last resort fallback
          else {
            refinedError =
              "Registration failed. Please check your information and try again.";
          }
        } else {
          if (
            rawError?.toLowerCase().includes("password") ||
            rawError?.toLowerCase().includes("credential")
          ) {
            refinedError = "Invalid email/username or password. Please try again.";
          } else if (
            rawError?.toLowerCase().includes("not found") ||
            rawError?.toLowerCase().includes("doesn't exist")
          ) {
            refinedError =
              "No account found. Please check your email/username or register first.";
          } else {
            refinedError =
              "Login failed. Please check your credentials and try again.";
          }
        }

        setError(refinedError);
      } else {
        console.error("❌ Unexpected Error:", error);
        setError("An unexpected error occurred. Please try again later.");
      }
    }
  };

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
                setError("");
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
                setError("");
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

          {/* Error Message */}
          {error && (
            <div className="mb-3 p-3 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
              <p className="text-xs font-mono text-red-700 dark:text-red-400 leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
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
                  : "CREATING ACCOUNT..."
                : mode === "login"
                  ? "LOGIN"
                  : "CREATE ACCOUNT"}
            </button>
          </form>

          {/* Footer Text */}
          {mode === "login" ? (
            <p className="text-center mt-3 text-xs text-gray-600 dark:text-neutral-400">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setMode("register");
                  setError("");
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
                  setError("");
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
