"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

type AuthMode = "login" | "register";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting form...", { mode, email: formData.email });

    setIsLoading(true);

    try {
      const url =
        mode === "login"
          ? `${proxy}/api/v1/users/login`
          : `${proxy}/api/v1/users/register`;

      const payload =
        mode === "login"
          ? {
              email: formData.email,
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

        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "An error occurred";

        alert(
          `${mode === "login" ? "Login" : "Registration"} failed: ${errorMessage}`,
        );
      } else {
        console.error("❌ Unexpected Error:", error);
        alert("An unexpected error occurred");
      }
    }
  };

  const handleSocialAuth = (provider: "github" | "google") => {
    // TODO: Implement social authentication
    console.log("Social auth with:", provider);
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center px-4 py-4 bg-gray-50 dark:bg-black overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
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
        <div className="bg-white dark:bg-[#0d0d0d] border border-gray-300 dark:border-gray-800 p-6">
          {/* Mode Toggle */}
          <div className="flex mb-3 border-b border-gray-200">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 pb-2 font-mono text-xs tracking-wider transition-colors ${
                mode === "login"
                  ? "text-black dark:text-white border-b-2 border-black dark:border-white"
                  : "text-gray-400 dark:text-gray-600"
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 pb-2 font-mono text-xs tracking-wider transition-colors ${
                mode === "register"
                  ? "text-black dark:text-white border-b-2 border-black dark:border-white"
                  : "text-gray-400 dark:text-gray-600"
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Username - Only for Register */}
            {mode === "register" && (
              <div>
                <label
                  htmlFor="username"
                  className="block font-mono text-xs tracking-wider text-gray-700 dark:text-gray-400 mb-1"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-black dark:text-white font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder="Username"
                  required
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-xs tracking-wider text-gray-700 dark:text-gray-400 mb-1"
              >
                EMAIL
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-black dark:text-white font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                placeholder="Email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block font-mono text-xs tracking-wider text-gray-700 dark:text-gray-400 mb-1"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-black dark:text-white font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
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

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-[#0d0d0d] font-mono text-gray-500 dark:text-gray-600 tracking-wider">
                OR
              </span>
            </div>
          </div>

          {/* Social Auth Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSocialAuth("github")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 text-black dark:text-white font-mono text-xs tracking-wider hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              CONTINUE WITH GITHUB
            </button>

            <button
              type="button"
              onClick={() => handleSocialAuth("google")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 text-black dark:text-white font-mono text-xs tracking-wider hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              CONTINUE WITH GOOGLE
            </button>
          </div>

          {/* Footer Text */}
          {mode === "login" ? (
            <p className="text-center mt-3 text-xs text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => setMode("register")}
                className="text-black dark:text-white font-mono tracking-wider underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-center mt-3 text-xs text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
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
            className="text-xs text-gray-600 dark:text-gray-500 hover:text-black dark:hover:text-white font-mono tracking-wider transition-colors"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
