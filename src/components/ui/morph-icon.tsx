'use client'

import React, { useState } from 'react'
import { MorphIcon as BaseMorphIcon } from 'morphicons/react'
import { 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Play, 
  Pause,
  PlayCircle,
  PauseCircle, 
  ShoppingCart, 
  ShoppingBag, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from 'lucide'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export { BaseMorphIcon as MorphIcon }
export {
  Sun,
  Moon,
  Menu,
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  Play,
  Pause,
  PlayCircle,
  PauseCircle,
  ShoppingCart,
  ShoppingBag,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle
}

/**
 * Animated Theme Toggle with MorphIcon Sun <-> Moon
 */
interface MorphThemeToggleProps {
  theme?: string
  onToggle: () => void
  className?: string
  size?: number
}

export function MorphThemeToggle({ theme, onToggle, className, size = 20 }: MorphThemeToggleProps) {
  const isDark = theme === 'dark'
  
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative p-2.5 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
        className
      )}
      aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
    >
      <BaseMorphIcon 
        icon={isDark ? Moon : Sun} 
        size={size} 
        spring="snappy" 
        className={cn(
          "transition-colors duration-300",
          isDark ? "text-amber-400" : "text-amber-500"
        )} 
      />
    </button>
  )
}

/**
 * Animated Mobile Menu Toggle with MorphIcon Menu <-> X
 */
interface MorphMenuToggleProps {
  isOpen: boolean
  onToggle: () => void
  className?: string
  size?: number
}

export function MorphMenuToggle({ isOpen, onToggle, className, size = 22 }: MorphMenuToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none",
        className
      )}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Đóng menu" : "Mở menu"}
    >
      <BaseMorphIcon icon={isOpen ? X : Menu} size={size} spring="snappy" />
    </button>
  )
}

/**
 * Animated Copy Button with MorphIcon Copy <-> Check
 */
interface MorphCopyButtonProps {
  textToCopy: string
  label?: string
  successMessage?: string
  className?: string
  size?: number
  variant?: 'icon' | 'badge' | 'button'
}

export function MorphCopyButton({
  textToCopy,
  label,
  successMessage = 'Đã sao chép vào bộ nhớ tạm',
  className,
  size = 15,
  variant = 'icon'
}: MorphCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast.success(successMessage)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
          copied 
            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs" 
            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700",
          className
        )}
        title="Sao chép"
      >
        <BaseMorphIcon 
          icon={copied ? Check : Copy} 
          size={size} 
          spring="snappy" 
          className={copied ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"} 
        />
        <span>{copied ? 'Đã chép' : (label || 'Sao chép')}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "p-1.5 rounded-lg transition-all cursor-pointer focus:outline-none",
        copied 
          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" 
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800",
        className
      )}
      title="Sao chép"
      aria-label="Sao chép"
    >
      <BaseMorphIcon 
        icon={copied ? Check : Copy} 
        size={size} 
        spring="snappy" 
        className={copied ? "text-emerald-600 dark:text-emerald-400" : "currentColor"} 
      />
    </button>
  )
}

/**
 * Animated Password Eye Toggle with MorphIcon Eye <-> EyeOff
 */
interface MorphPasswordToggleProps {
  isVisible: boolean
  onToggle: () => void
  className?: string
  size?: number
}

export function MorphPasswordToggle({ isVisible, onToggle, className, size = 18 }: MorphPasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer",
        className
      )}
      aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      tabIndex={-1}
    >
      <BaseMorphIcon icon={isVisible ? EyeOff : Eye} size={size} spring="snappy" />
    </button>
  )
}

/**
 * Animated Add to Cart Icon with ShoppingCart <-> Check feedback
 */
interface MorphAddToCartIconProps {
  isAdded: boolean
  size?: number
  className?: string
}

export function MorphAddToCartIcon({ isAdded, size = 18, className }: MorphAddToCartIconProps) {
  return (
    <BaseMorphIcon 
      icon={isAdded ? Check : ShoppingCart} 
      size={size} 
      spring="snappy" 
      className={cn("transition-transform duration-200", className)} 
    />
  )
}

/**
 * Animated Play/Pause Status Icon
 */
interface MorphStatusIconProps {
  status: 'active' | 'paused' | 'completed' | 'pending'
  size?: number
  className?: string
}

export function MorphStatusIcon({ status, size = 18, className }: MorphStatusIconProps) {
  const isPlaying = status === 'active'
  return (
    <BaseMorphIcon 
      icon={isPlaying ? PauseCircle : PlayCircle} 
      size={size} 
      spring="snappy" 
      className={className} 
    />
  )
}
