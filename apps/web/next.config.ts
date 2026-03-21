import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  transpilePackages: ["@mt/api", "@mt/auth"],
  serverExternalPackages: ["@node-rs/argon2"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.planningcenteronline.com",
      },
    ],
  },
};

export default nextConfig;
