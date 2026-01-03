import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip linting during production builds (lint is still available via npm run lint locally).
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
