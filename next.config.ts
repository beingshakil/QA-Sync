import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the app rail's user menu.
  devIndicators: false,
  // Database drivers load native/WASM files at runtime: keep them out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Allowed next/image qualities (required from Next 16): 75 is the default, 90 is the hero demo shot.
  images: { qualities: [75, 90] },
};

export default nextConfig;
