"use client";

import { useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function ContactPage() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setStatus("loading");
    setError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const serverMessage = data?.error || data?.message || "Failed to send message";
        throw new Error(`${serverMessage} (${res.status})`);
      }

      setStatus("success");
      setMessage("");

      // Reset so user can send another message and button state does not stay "Sent"
      setTimeout(() => setStatus("idle"), 2200);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-28 pb-16 font-display">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-black dark:text-white mb-6">
          Contact Us
        </h1>

        <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-10 leading-relaxed">
          Have a question, feedback, or want to report an issue? We'd love to hear from you. Use the form below to send us
          a message.
        </p>

        <section className="space-y-10">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0b0b0b] p-6">
            <h2 className="text-2xl font-display font-semibold tracking-tight text-black dark:text-white mb-3">
              Send Us a Message
            </h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Write your message here..."
              className="w-full rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                onClick={sendMessage}
                disabled={status === "loading" || !message.trim()}
                className={
                  "inline-flex items-center justify-center px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-mono text-sm tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed " +
                  (status === "success" ? "animate-pulse" : "")
                }
              >
                {status === "loading" ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : status === "success" ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Sent
                  </>
                ) : (
                  "Send message"
                )}
              </button>
              {status === "error" && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
