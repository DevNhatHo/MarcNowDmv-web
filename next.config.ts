import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the repository-owned agent instructions when starting development.
  agentRules: false,
};

export default nextConfig;
