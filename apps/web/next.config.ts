import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@devflow/db", "@devflow/shared"],
  serverExternalPackages: ["@prisma/client"],
}

export default nextConfig
