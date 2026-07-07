import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker / Dokploy deployments
  output: "standalone",
  trailingSlash: true,
  staticPageGenerationTimeout: 120,
  images: {
    // Next.js Image Optimization requires a server; disable for static export
    unoptimized: true,
  },
};

export default nextConfig;
