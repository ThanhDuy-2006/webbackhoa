import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.12'],
  images: {
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
