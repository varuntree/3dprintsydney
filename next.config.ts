import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  eslint: {
    // Keep product builds unblocked by lint warnings/errors.
    // Lint still runs in CI and during local dev.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to succeed even if there are type errors.
    // This does not affect typechecking in CI/local dev.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
