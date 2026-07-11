import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  typescript: { ignoreBuildErrors: true },
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  }
};

export default nextConfig;
