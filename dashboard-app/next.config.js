/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['@modelcontextprotocol/sdk'],
  },
  // Cloudflare Pages compatibility
  output: 'standalone',
  // Image optimization for Cloudflare
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
