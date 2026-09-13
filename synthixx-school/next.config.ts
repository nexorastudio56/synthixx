import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives in a sub-folder of the main Synthixx repo, which has its own
  // lockfile. Pin the workspace root so Next doesn't infer the parent directory
  // (and accidentally pull in the parent app's proxy/middleware).
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // The dashboard lives under /school; send the bare domain there.
      { source: "/", destination: "/school", permanent: false },
    ];
  },
};

export default nextConfig;
