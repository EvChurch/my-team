import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_SHA: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    NEXT_PUBLIC_APP_ENV: process.env.RAILWAY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  },
  output: "standalone",
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
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
