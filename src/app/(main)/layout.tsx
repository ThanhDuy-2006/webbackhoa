import { Navbar } from '@/components/layout/Navbar'
import { PageTransition } from '@/components/ui/PageTransition'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}
