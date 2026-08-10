'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function MobileBackButton() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/tai-khoan') return null

  return (
    <div className="lg:hidden mb-4">
      <button 
        onClick={() => router.push('/tai-khoan')}
        className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Quay lại
      </button>
    </div>
  )
}
