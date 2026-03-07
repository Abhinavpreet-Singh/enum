"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function LoadingBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    // Reset and start loading
    const startLoading = () => {
      if (isMounted) {
        setLoading(true);
        setProgress(20);
      }
    };

    // Small delay to avoid flash on quick navigations
    const startTimer = setTimeout(startLoading, 50);

    // Simulate progress
    const timer1 = setTimeout(() => isMounted && setProgress(40), 150);
    const timer2 = setTimeout(() => isMounted && setProgress(60), 250);
    const timer3 = setTimeout(() => isMounted && setProgress(80), 350);

    // Complete loading
    const timer4 = setTimeout(() => {
      if (isMounted) {
        setProgress(100);
        setTimeout(() => {
          if (isMounted) {
            setLoading(false);
            setProgress(0);
          }
        }, 200);
      }
    }, 550);

    return () => {
      isMounted = false;
      clearTimeout(startTimer);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-99999 h-0.5 bg-transparent pointer-events-none"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Page loading progress"
    >
      <div
        className="h-full bg-black dark:bg-white transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 8px currentColor",
        }}
      />
    </div>
  );
}
