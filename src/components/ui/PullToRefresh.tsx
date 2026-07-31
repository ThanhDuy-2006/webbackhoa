'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const isPullingRef = useRef(false)

  const pullDistanceRef = useRef(0)
  const refreshingRef = useRef(false)

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY
      isPullingRef.current = true
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPullingRef.current || refreshingRef.current) return
    
    const clientY = e.touches[0].clientY
    const deltaY = clientY - startYRef.current
    
    if (deltaY > 0) {
      // Apply a resistance factor
      const pull = Math.min(80, deltaY * 0.4)
      pullDistanceRef.current = pull
      setPullDistance(pull)
      
      if (e.cancelable) {
        e.preventDefault()
      }
    } else {
      isPullingRef.current = false
      pullDistanceRef.current = 0
      setPullDistance(0)
    }
  }

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || refreshingRef.current) return
    isPullingRef.current = false

    if (pullDistanceRef.current >= 60) {
      refreshingRef.current = true
      setRefreshing(true)
      
      pullDistanceRef.current = 40
      setPullDistance(40)
      
      try {
        await onRefresh()
      } catch (err) {
        console.error("Refresh failed", err)
      } finally {
        refreshingRef.current = false
        setRefreshing(false)
        
        pullDistanceRef.current = 0
        setPullDistance(0)
      }
    } else {
      pullDistanceRef.current = 0
      setPullDistance(0)
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, []) // Empty dependency array prevents listener rebinding loop
  return (
    <div ref={containerRef} className="relative w-full">
      {/* Pull indicator */}
      <motion.div
        style={{ height: pullDistance }}
        className="overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 transition-colors"
        animate={{ height: refreshing ? 50 : pullDistance }}
        transition={refreshing ? { type: 'spring', damping: 20 } : { duration: 0 }}
      >
        <motion.div 
          animate={refreshing ? { rotate: 360 } : { rotate: pullDistance * 4 }}
          transition={refreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0 }}
          className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {refreshing ? 'Đang cập nhật...' : pullDistance >= 60 ? 'Thả ra để cập nhật' : 'Kéo xuống để cập nhật'}
          </span>
        </motion.div>
      </motion.div>
      
      {/* Scrollable Content */}
      <motion.div
        animate={{ y: refreshing ? 0 : pullDistance }}
        transition={refreshing ? { type: 'spring', damping: 20 } : { duration: 0 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
