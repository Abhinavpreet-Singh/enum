"use client";

import React, { useState } from "react";

const BOTPRES_SHAREABLE_URL =
  "https://cdn.botpress.cloud/webchat/v3.6/shareable.html?configUrl=https://files.bpcontent.cloud/2026/05/26/17/20260526172016-8D8ZYR3H.json";

export default function BotpressChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-60">
      {!isOpen ? (
        <button
          type="button"
          aria-label="Open Enum chat"
          title="Chat"
          onClick={() => setIsOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-gray-800 dark:bg-black dark:text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lgogo.png"
            alt="Enum"
            className="h-7 w-7 object-contain"
          />
        </button>
      ) : (
        <div
          aria-label="Botpress chat widget"
          className="relative h-[640px] w-[420px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-black"
        >
          <button
            type="button"
            aria-label="Close Enum chat"
            title="Close"
            onClick={() => setIsOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-black shadow-sm transition hover:bg-white dark:border-gray-800 dark:bg-black/90 dark:text-white"
          >
            ×
          </button>

          <iframe
            title="Botpress chatbot"
            src={BOTPRES_SHAREABLE_URL}
            className="h-full w-full border-0 bg-transparent"
            loading="lazy"
            referrerPolicy="no-referrer"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}
    </div>
  );
}

