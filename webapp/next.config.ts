import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  serverExternalPackages: ['neo4j-driver', 'pdfjs-dist', 'pdf-parse'],

  images: {
    remotePatterns: [],
  },

  // async redirects() {
  //   return [
  //     {
  //       source: '/api/auth',
  //       destination: '/api/auth/',
  //       permanent: true,
  //     },
  //   ]
  // },

  // async rewrites() {
  //   const authOrigin = process.env.AUTH_SERVICE_ORIGIN || 'http://127.0.0.1:8100'
  //   return [
  //     {
  //       source: '/api/auth/health',
  //       destination: `${authOrigin}/health`,
  //     },
  //     {
  //       source: '/api/auth/:path*',
  //       destination: `${authOrigin}/auth/:path*`,
  //     },
  //   ]
  // },

  env: {
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_USER: process.env.NEO4J_USER,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
    NEXT_PUBLIC_REDAMON_VERSION: process.env.NEXT_PUBLIC_REDAMON_VERSION,
  },
}

export default nextConfig
