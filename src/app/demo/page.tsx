"use client";

import Header from "@/components/header";
import { useTheme } from "@/providers/theme-provider";
import { useRef } from "react";

export default function DemoPage() {
  const { theme } = useTheme();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  // Continuously updated playback times — always current before theme switch
  const playbackTimes = useRef<number[]>([0, 0]);

  // demo videos for major features
  // Light mode videos (shown when in dark mode)
  // Dark mode videos (shown when in light mode)
  const videos = [
    {
      id: "dsa-arena",
      title: "DSA Arena Walkthrough",
      lightModeSrc: "/dsa-light.mp4", // video with light theme
      darkModeSrc: "/dsa-dark.mp4",   // video with dark theme
      description: "A walkthrough of the DSA arena interface and solving workflow."
    },
    {
      id: "simulations",
      title: "Simulations Environment Demo",
      lightModeSrc: "/simulations-light.mp4", // video with light theme
      darkModeSrc: "/simulations-dark.mp4",   // video with dark theme
      description: "Demonstrates configuring and running production simulations."
    },
  ];

  // Get the appropriate video source based on current theme
  const getVideoSrc = (video: typeof videos[0]) => {
    // When in dark mode, show light mode video (and vice versa)
    return theme === "dark" ? video.lightModeSrc : video.darkModeSrc;
  };

  const handleReplay = (index: number) => {
    const video = videoRefs.current[index];
    if (video) {
      video.currentTime = 0;
      playbackTimes.current[index] = 0;
      video.play();
    }
  };

  // Called every time the video progresses — keeps playbackTimes always up to date
  const handleTimeUpdate = (index: number) => {
    const video = videoRefs.current[index];
    if (video) {
      playbackTimes.current[index] = video.currentTime;
    }
  };

  // When new video loads after theme switch, seek to the saved timestamp
  const handleVideoLoaded = (index: number) => {
    const video = videoRefs.current[index];
    if (video && playbackTimes.current[index] > 0) {
      video.currentTime = playbackTimes.current[index];
      video.play();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />
      <main className="pt-28 pb-20 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Header Section */}
        <div className="mb-16 space-y-3">
          <p className="font-mono text-[11px] tracking-[0.3em] text-gray-400 uppercase text-center">
            ENUM / Demos
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-center text-black dark:text-white tracking-tight">
            Product Demos
          </h1>
          <p className="font-mono text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-center leading-relaxed">
            Explore the key features of ENUM through short walkthrough videos. Click play to see
            the DSA Arena and Simulations areas in action, highlighting typical workflows and
            capabilities.
          </p>
        </div>

        {/* Videos Grid */}
        <div className="space-y-24 md:space-y-32">
          {videos.map((video, index) => (
            <div key={video.id} className="w-full">
              <div className="relative aspect-video bg-gray-900 dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700">
                <video
                  key={`${video.id}-${theme}`} // Forces re-mount when theme changes
                  ref={(el) => { videoRefs.current[index] = el; }}
                  className="w-full h-full object-cover"
                  src={getVideoSrc(video)}
                  autoPlay
                  muted
                  loop
                  playsInline
                  onTimeUpdate={() => handleTimeUpdate(index)}
                  onLoadedData={() => handleVideoLoaded(index)}
                />
                <button
                  onClick={() => handleReplay(index)}
                  className="absolute bottom-6 right-6 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full transition-all duration-200 shadow-lg"
                  aria-label="Replay video"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
              <div className="mt-8 space-y-2">
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
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
