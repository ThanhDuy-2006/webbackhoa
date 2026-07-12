import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { PwaRegister } from '@/components/pwa/PwaRegister'
import { OfflineAlert } from '@/components/pwa/OfflineAlert'

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
      <body className={`${inter.className} antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegister />
          {children}
          <OfflineAlert />
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
