'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    // Chỉ kích hoạt Service Worker ở môi trường Production (nhằm tránh xung đột với hot-reload HMR ở môi trường Dev)
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered successfully with scope:', registration.scope)
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error)
          })
      })
    }
  }, [])

  return null
}
