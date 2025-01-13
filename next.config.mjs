<<<<<<< HEAD
=======
import TerserPlugin from 'terser-webpack-plugin';

>>>>>>> bdeaae8712f3ae791e958f61511642691016c3d1
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
<<<<<<< HEAD
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  webpack: (config, { dev, isServer }) => {
    // Add memory optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        mergeDuplicateChunks: true,
        minimize: true,
        sideEffects: true,
      }
    }
    return config
=======
  swcMinify: false,
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        minimizer: [
          new TerserPlugin({
            parallel: true,
            terserOptions: {
              compress: {
                drop_console: process.env.NODE_ENV === 'production',
              },
              format: {
                comments: false,
              },
            },
            extractComments: false,
          }),
        ],
      };
    }
    return config;
>>>>>>> bdeaae8712f3ae791e958f61511642691016c3d1
  },
}

export default nextConfig
