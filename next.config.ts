import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.12'],
  compress: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      'date-fns',
      'clsx',
      'tailwind-merge',
      'sonner',
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/don-hang',
        destination: '/tai-khoan/don-hang',
        permanent: true,
      },
      {
        source: '/don-hang/:id',
        destination: '/tai-khoan/don-hang',
        permanent: true,
      },
      {
        source: '/nap-tien',
        destination: '/tai-khoan/nap-tien',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
