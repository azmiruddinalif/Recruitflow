/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@recruitflow/types', '@recruitflow/shared', '@recruitflow/validation'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const cleanBase = apiBase.replace(/\/$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${cleanBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
