import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  output: "export",
  basePath: "/yuzu",
  trailingSlash: true,
};
export default nextConfig;
