import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bách Hóa Trực Tuyến',
    short_name: 'Bách Hóa',
    description: 'Ứng dụng mua sắm bách hóa thực phẩm tươi sạch trực tuyến',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    icons: [
      {
        src: 'https://placehold.co/192x192/059669/ffffff?text=BH',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://placehold.co/512x512/059669/ffffff?text=BH',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
