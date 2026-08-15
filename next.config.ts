import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // A cold prerender reads all escrows and resolves every GitHub author.
  staticPageGenerationTimeout: 300,
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/logos/orange-logo.svg",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "github.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
