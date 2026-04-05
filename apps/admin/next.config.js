/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent OpenTelemetry (pulled in by bullmq/pino) from being bundled during SSR
  serverExternalPackages: ['@opentelemetry/api', '@opentelemetry/sdk-trace-base', 'bullmq', 'ioredis'],

  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: 'http://localhost:3001/v1/:path*' }];
  },
};
module.exports = nextConfig;
