/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    // Prevent OpenTelemetry (pulled in by bullmq/pino) from being bundled during SSR
    serverComponentsExternalPackages: ['@opentelemetry/api', '@opentelemetry/sdk-trace-base', 'bullmq', 'ioredis'],
  },

  images: {
    domains: [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      's3.amazonaws.com',
      'cdn.goodlifetask.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ];
  },

  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/v1/:path*', destination: 'http://localhost:3001/v1/:path*' }]
      : [];
  },
};

module.exports = nextConfig;
