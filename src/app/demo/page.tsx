"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { useTheme } from "@/providers/theme-provider";
import { useRef, useState } from "react";

export default function DemoPage() {
  const { theme } = useTheme();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  // Persist playback state/time across theme-based video remounts.
  const playbackTimes = useRef<Record<string, number>>({});
  const playbackStateRef = useRef<Record<string, boolean>>({});
  const [playbackState, setPlaybackState] = useState<Record<string, boolean>>(
    {},
  );

  // demo videos for major features
  // Light mode videos (shown when in dark mode)
  // Dark mode videos (shown when in light mode)
  const videos = [
    {
      id: "dsa-arena",
      title: "DSA Arena Walkthrough",
      lightModeSrc: "/dsa-light.mp4", // video with light theme
      darkModeSrc: "/dsa-dark.mp4", // video with dark theme
      description:
        "A walkthrough of the DSA arena interface and solving workflow.",
    },
    {
      id: "simulations",
      title: "Simulations Environment Demo",
      lightModeSrc: "/simulations-light.mp4", // video with light theme
      darkModeSrc: "/simulations-dark.mp4", // video with dark theme
      description:
        "Demonstrates configuring and running production simulations.",
    },
  ];

  // Get the appropriate video source based on current theme
  const getVideoSrc = (video: (typeof videos)[0]) => {
    // When in dark mode, show light mode video (and vice versa)
    return theme === "dark" ? video.lightModeSrc : video.darkModeSrc;
  };

  const setVideoPlaybackState = (id: string, isPlaying: boolean) => {
    playbackStateRef.current[id] = isPlaying;
    setPlaybackState((prev) => ({ ...prev, [id]: isPlaying }));
  };

  const handleTogglePlayback = async (index: number, id: string) => {
    const video = videoRefs.current[index];
    if (!video) return;

    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      try {
        await video.play();
        setVideoPlaybackState(id, true);
      } catch {
        setVideoPlaybackState(id, false);
      }
      return;
    }

    video.pause();
    setVideoPlaybackState(id, false);
  };

  // Called every time the video progresses — keeps playbackTimes always up to date
  const handleTimeUpdate = (index: number, id: string) => {
    const video = videoRefs.current[index];
    if (video) {
      playbackTimes.current[id] = video.currentTime;
    }
  };

  // When new themed video loads, restore time and continue only if it was playing.
  const handleVideoLoaded = (index: number, id: string) => {
    const video = videoRefs.current[index];
    if (!video) return;

    const savedTime = playbackTimes.current[id] ?? 0;
    if (savedTime > 0) {
      video.currentTime = savedTime;
    }

    if (playbackStateRef.current[id]) {
      video.play().catch(() => {
        setVideoPlaybackState(id, false);
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />
      <main className="pt-28 pb-20 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Videos Grid */}
        <div id="demo-videos" className="space-y-24 md:space-y-32">
          {videos.map((video, index) => (
            <div key={video.id} className="w-full">
              <div className="mb-8 space-y-2">
                <p className="font-mono text-[11px] tracking-[0.3em] text-gray-400 uppercase text-center">
                  Demo {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-center text-black dark:text-white tracking-tight">
                  {video.title}
                </h3>
                <p className="font-mono text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-center leading-relaxed">
                  {video.description}
                </p>
              </div>

              <div className="relative aspect-video bg-gray-900 dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700">
                <video
                  key={`${video.id}-${theme}`} // Forces re-mount when theme changes
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  className="w-full h-full object-cover"
                  src={getVideoSrc(video)}
                  muted
                  playsInline
                  preload="metadata"
                  onClick={() => handleTogglePlayback(index, video.id)}
                  onPlay={() => setVideoPlaybackState(video.id, true)}
                  onPause={() => setVideoPlaybackState(video.id, false)}
                  onEnded={() => setVideoPlaybackState(video.id, false)}
                  onTimeUpdate={() => handleTimeUpdate(index, video.id)}
                  onLoadedData={() => handleVideoLoaded(index, video.id)}
                />

                {!playbackState[video.id] && (
                  <button
                    onClick={() => handleTogglePlayback(index, video.id)}
                    className="absolute inset-0 flex items-center justify-center group"
                    aria-label={`Play ${video.title}`}
                  >
                    <span className="absolute h-24 w-24 rounded-full border border-white/40 dark:border-gray-900/60 animate-pulse" />
                    <span className="relative h-16 w-16 rounded-full bg-white/15 dark:bg-gray-900/80 backdrop-blur-md border-2 border-white/60 dark:border-gray-900 flex items-center justify-center shadow-[0_12px_40px_rgba(255,255,255,0.2)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-105">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-7 h-7 text-white dark:text-white ml-0.5"
                        aria-hidden="true"
                      >
                        <path d="M8 5.14v13.72c0 .79.87 1.27 1.54.84l10.2-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
                      </svg>
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
