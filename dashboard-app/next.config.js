/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Vercel deployment configuration
  // Using 'standalone' output for optimal deployment performance
  output: 'standalone',

  // Image optimization (unoptimized for demo mode compatibility)
  images: {
    unoptimized: true,
  },

  // External packages that should not be bundled
  serverExternalPackages: ['@modelcontextprotocol/sdk'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Remove externals for Vercel compatibility
    // config.externals = [...(config.externals || []), 'sharp', 'onnxruntime-node'];
    return config;
  },
}

module.exports = nextConfig
