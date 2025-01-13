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
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  swcMinify: false,
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        mergeDuplicateChunks: true,
        minimize: true,
        sideEffects: true,
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
  },
}

export default nextConfig
