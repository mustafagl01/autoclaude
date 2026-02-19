/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cloudflare Pages compatibility
  // Using 'standalone' output for optimal Cloudflare Pages deployment
  // The @cloudflare/next-on-pages adapter will convert this to .vercel/output/static
  output: 'standalone',

  // Image optimization for Cloudflare Pages
  // Cloudflare Pages doesn't support Next.js Image Optimization API
  // Set unoptimized to true to use static images
  images: {
    unoptimized: true,
  },

  // Experimental features for Cloudflare Workers compatibility
  serverExternalPackages: ['@modelcontextprotocol/sdk'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack configuration for Cloudflare Workers edge runtime
  webpack: (config, { isServer }) => {
    // Ensure compatibility with Cloudflare Workers environment
    if (isServer) {
      config.externals = [...(config.externals || []), 'sharp', 'onnxruntime-node'];
    }
    return config;
  },
}

module.exports = nextConfig
