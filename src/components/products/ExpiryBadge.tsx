'use client'

import React from 'react'
import { getExpiryInfo, ExpiryStatusType } from '@/lib/expiry-utils'
import { Clock, AlertTriangle, AlertCircle, Calendar } from 'lucide-react'

interface ExpiryBadgeProps {
  expiryDate?: string | Date | null
  showIcon?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function ExpiryBadge({ expiryDate, showIcon = true, className = '', size = 'sm' }: ExpiryBadgeProps) {
  const info = getExpiryInfo(expiryDate)
  if (info.status === 'none') return null

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'

  const renderIcon = () => {
    if (!showIcon) return null
    if (info.status === 'expired') {
      return <AlertCircle className="w-3 h-3 mr-1 shrink-0 text-rose-600" />
    }
    if (info.status === 'warning') {
      return <AlertTriangle className="w-3 h-3 mr-1 shrink-0 text-amber-600" />
    }
    return <Calendar className="w-3 h-3 mr-1 shrink-0 text-slate-500" />
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all ${sizeClasses} ${info.badgeClass} ${className}`}
      title={info.formattedDate ? `Hạn sử dụng: ${info.formattedDate}` : ''}
    >
      {renderIcon()}
      <span>{info.label}</span>
    </span>
  )
}
