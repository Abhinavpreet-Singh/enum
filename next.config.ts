import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Tauri desktop app
  // Generates an `out/` directory with pure HTML/JS/CSS files
  // that Tauri can bundle and serve without a Node.js server.
  trailingSlash: true,
  staticPageGenerationTimeout: 120,
  images: {
    // Next.js Image Optimization requires a server; disable for static export
    unoptimized: true,
  },
};

export default nextConfig;
