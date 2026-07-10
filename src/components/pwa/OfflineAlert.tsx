'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineAlert() {
  const [isOffline, setIsOffline] = useState(false)
  const [showOnlineAlert, setShowOnlineAlert] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOffline(false)
      setShowOnlineAlert(true)
      const timer = setTimeout(() => {
        setShowOnlineAlert(false)
      }, 3000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setShowOnlineAlert(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Set initial state
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {/* Offline Alert */}
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold shadow-md"
        >
          <WifiOff className="h-4 w-4 animate-pulse" />
          <span>Bạn đang ngoại tuyến. Đang chạy ở chế độ offline.</span>
        </motion.div>
      )}

      {/* Reconnected Alert */}
      {showOnlineAlert && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold shadow-md"
        >
          <Wifi className="h-4 w-4" />
          <span>Đã khôi phục kết nối Internet!</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
