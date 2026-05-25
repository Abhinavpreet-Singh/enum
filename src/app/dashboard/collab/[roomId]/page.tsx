"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Users } from "lucide-react";
import CollaborativeEditor from "@/components/simulations/CollaborativeEditor";

const toolbarBtn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors";

const toolbarBtnGhost = `${toolbarBtn} border-black/10 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/10 dark:text-white dark:hover:bg-white dark:hover:text-black`;

const toolbarBtnActive = `${toolbarBtn} border-black bg-black text-white dark:border-white dark:bg-white dark:text-black`;

/**
 * Dynamic room page — renders the collaborative editor for a given roomId.
 * Reads the username from sessionStorage (set on the landing page).
 */
export default function CollabRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const roomId = params.roomId;

  useEffect(() => {
    const stored =
      sessionStorage.getItem("collab_username") ||
      localStorage.getItem("displayName") ||
      localStorage.getItem("Name") ||
      "";

    if (!stored.trim()) {
      router.replace("/dashboard/collab");
      return;
    }

    sessionStorage.setItem("collab_username", stored.trim());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsername(stored.trim());
  }, [router]);

  function handleCopyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleLeave() {
    router.push("/dashboard/collab");
  }

  if (!username) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-white text-black dark:bg-black dark:text-white">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2"
          style={{
            borderColor: "rgba(0,0,0,0.12)",
            borderTopColor: "#111111",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-black dark:bg-black dark:text-white">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-black/10 bg-white px-4 dark:border-white/10 dark:bg-black">
        {/* Left: navigation + room identity */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleLeave}
            className={toolbarBtnGhost}
            aria-label="Back to collaboration home"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div
            className="hidden h-5 w-px shrink-0 bg-black/10 dark:bg-white/10 sm:block"
            aria-hidden
          />

          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="truncate text-sm font-semibold tracking-tight">
              Collab room
            </span>
            <span
              className="truncate font-mono text-[11px] text-black/55 dark:text-white/55"
              title={roomId}
            >
              {roomId}
            </span>
          </div>
        </div>

        {/* Right: actions + identity */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className={copied ? toolbarBtnActive : toolbarBtnGhost}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Copy invite</span>
              </>
            )}
          </button>

          <div
            className="hidden h-5 w-px shrink-0 bg-black/10 dark:bg-white/10 md:block"
            aria-hidden
          />

          <div className="flex h-9 max-w-[10rem] items-center gap-2 rounded-md border border-black/10 bg-black/[0.03] px-2.5 text-xs font-medium text-black/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75 sm:max-w-[12rem]">
            <Users className="h-3.5 w-3.5 shrink-0 text-black/40 dark:text-white/40" />
            <span className="truncate">{username}</span>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <CollaborativeEditor
          roomId={roomId}
          username={username}
          language="javascript"
          initialCode={`// 🚀 Welcome to Debug Room: ${roomId}\n// Share this room's link with teammates to code together in real-time.\n\nfunction solve(input) {\n  // Start coding here...\n  \n}\n`}
        />
      </div>
    </div>
  );
}
