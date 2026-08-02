'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    const onFocus = () => {
      router.refresh()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [router])

  return null
}
