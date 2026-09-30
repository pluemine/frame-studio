import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, ""),
  images: { unoptimized: true },
  transpilePackages: ["@frame-studio/kit"],
};

export default nextConfig;
