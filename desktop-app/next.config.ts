import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Tauri expects a static export
  output: "export",
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Suppress workspace root inference warning
  outputFileTracingRoot: __dirname,
  // Base path is "/" when running in Tauri
  trailingSlash: true,
};

export default nextConfig;
