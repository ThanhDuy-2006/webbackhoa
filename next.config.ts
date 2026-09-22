import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.12'],
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: [
      'lucide-react',
      'lucide',
      'morphicons',
      'recharts',
      'framer-motion',
      'date-fns',
      'clsx',
      'tailwind-merge',
      'sonner',
      '@base-ui/react',
    ],
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
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
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
