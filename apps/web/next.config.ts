import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  transpilePackages: ["@repo/api", "@repo/auth", "@repo/shared"],
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;
