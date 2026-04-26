import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow native modules (better-sqlite3)
  serverExternalPackages: ["better-sqlite3"],

  // Disable body size limit for proxy routes  
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
