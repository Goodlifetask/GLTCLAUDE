import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for development warnings
  reactStrictMode: true,

  // Experimental App Router features
  experimental: {
    serverComponentsExternalPackages: [],
  },

  // Image optimisation
  images: {
    domains: [
      'lh3.googleusercontent.com',   // Google avatars
      'avatars.githubusercontent.com',
      's3.amazonaws.com',
      'cdn.goodlifetask.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-Content-Type-Options',      value: 'nosniff' },
          { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',           value: 'geolocation=(), camera=(), microphone=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // Rewrites for API proxy (dev only)
  async rewrites() {
    return process.env['NODE_ENV'] === 'development'
      ? [
          {
            source: '/api/v1/:path*',
            destination: 'http://localhost:3001/v1/:path*',
          },
        ]
      : [];
  },

  // Webpack for SVG support
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default nextConfig;
