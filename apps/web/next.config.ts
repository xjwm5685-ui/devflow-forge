import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@devflow/db", "@devflow/shared"],
  serverExternalPackages: ["@prisma/client"],
}

export default nextConfig
