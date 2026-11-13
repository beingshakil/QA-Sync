import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the app rail's user menu.
  devIndicators: false,
  // Database drivers load native/WASM files at runtime: keep them out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
