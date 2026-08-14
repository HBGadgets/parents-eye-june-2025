import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  /* config options here */
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dummyjson.com",
      },
    ],
  },
  /** ⚠️⚠️⚠️⚠️⚠️⚠️⚠️ Comment this before uploading to production */
  eslint: {
    ignoreDuringBuilds: true,
  },
  // compiler: {
  //   removeConsole: true,
  // },
  typescript: {
    /** ⚠️⚠️⚠️⚠️⚠️⚠️⚠️ Comment this before uploading to production */
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // NOTE: redirects/rewrites are NOT supported with output: "export" (static builds).
  // .txt URL stripping is handled client-side in src/app/dashboard/layout.tsx
};

export default nextConfig;
