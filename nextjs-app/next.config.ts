import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Optimize for production builds
  output: 'standalone', // Creates optimized standalone build for deployment
};

export default nextConfig;
