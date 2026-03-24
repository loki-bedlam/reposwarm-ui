import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-codecommit'
  ],
  async rewrites() {
    const apiUrl = process.env.REPOSWARM_API_URL || 'http://api:3000'
    return [
      {
        source: '/v1/:path*',
        destination: `${apiUrl}/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
