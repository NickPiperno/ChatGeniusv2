import TerserPlugin from 'terser-webpack-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizeCss: true,
    memoryBasedWorkersCount: true,
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  swcMinify: false,
  webpack: (config, { dev, isServer }) => {
    // Add memory optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        mergeDuplicateChunks: true,
        minimize: true,
        minimizer: [
          '...',
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: process.env.NODE_ENV === 'production',
              },
            },
          }),
        ],
        sideEffects: true,
      }
    }
    return config
  },
}

export default nextConfig
