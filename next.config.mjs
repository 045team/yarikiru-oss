/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Node.js built-ins: treat as external on server
      config.externals = [...(config.externals || []), 'fs', 'path', 'os', 'crypto'];
    }
    return config;
  },
  // OSS版: better-sqlite3 を使用 (Turso/LibSQL は不使用)
  serverExternalPackages: ['better-sqlite3', '@libsql/client', 'libsql'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
