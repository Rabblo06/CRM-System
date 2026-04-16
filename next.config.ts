import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      tailwindcss: path.resolve(process.cwd(), 'node_modules/tailwindcss'),
    },
  },
  async headers() {
    return [
      {
        // Allow popup <-> opener communication on the OAuth callback page
        source: '/auth/gmail-callback',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
      {
        source: '/auth/calendar-callback',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
      {
        // Also relax COOP on the main app so opener ref survives the round-trip
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
        ],
      },
    ];
  },
};

export default nextConfig;
