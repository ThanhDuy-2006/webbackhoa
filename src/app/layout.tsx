import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { PwaRegister } from '@/components/pwa/PwaRegister'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'Bách Hóa - Mua Sắm Trực Tuyến',
  description: 'Website thương mại điện tử chuyên cung cấp sản phẩm chất lượng',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bách Hóa',
  },
}

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen bg-slate-50 dark:bg-slate-950`}>
        <PwaRegister />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
