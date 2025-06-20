import type { NextConfig } from "next";

module.exports = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Disable telemetry in production
  // experimental: {
  //   instrumentationHook: false,
  // },

  // Configure images for production
  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Additional configuration to ensure errors are ignored
  experimental: {
    typedRoutes: false,
  },
};
