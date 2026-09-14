/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  async rewrites() {
    const backendUrl = (
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:4000'
    ).replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
