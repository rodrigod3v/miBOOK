import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["192.168.0.28", "localhost", "127.0.0.1"],
};

export default nextConfig;
