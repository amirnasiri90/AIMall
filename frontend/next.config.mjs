/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
  // فقط درخواست‌های API به بک‌اند پروکسی می‌شوند؛ مسیر _next/static هرگز پروکسی نمی‌شود
  trailingSlash: false,
  // حد مجاز حجم بدنهٔ درخواست هنگام پروکسی به بک‌اند (برای ویرایش تصویر با base64)
  experimental: {
    proxyClientMaxBodySize: '50mb',
  },
  async rewrites() {
    const apiPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '3001';
    return [
      { source: '/api/v1/:path*', destination: `http://127.0.0.1:${apiPort}/api/v1/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};
export default nextConfig;
