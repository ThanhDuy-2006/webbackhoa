import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'Bách Hóa - Mua Sắm Trực Tuyến',
  description: 'Website thương mại điện tử chuyên cung cấp sản phẩm chất lượng',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen bg-slate-50 dark:bg-slate-950`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
