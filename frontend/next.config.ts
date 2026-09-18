import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // The floating dev badge overlaps the sticky footer's brand mark.
  devIndicators: false,
};

export default nextConfig;
