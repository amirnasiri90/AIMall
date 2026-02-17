/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
  // پروکسی API تا از گوشی/سیستم دیگر فقط به همین سرور (پورت 3000) وصل شوید — خطای Load failed برطرف می‌شود
  async rewrites() {
    const apiPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '3001';
    return [
      { source: '/api/v1/:path*', destination: `http://127.0.0.1:${apiPort}/api/v1/:path*` },
    ];
  },
};
export default nextConfig;
