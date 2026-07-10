'use client'

import React, { useState } from 'react'
import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

interface ProgressiveImageProps extends Omit<ImageProps, 'onLoadingComplete' | 'onLoad'> {
  containerClassName?: string
}

export function ProgressiveImage({ src, alt, className, containerClassName, fill, ...props }: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className={cn("relative overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors w-full h-full", containerClassName)}>
      {/* Loading Skeleton Blur Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
      )}

      <Image
        src={src}
        alt={alt}
        fill={fill}
        className={cn(
          "transition-all duration-500 ease-out",
          isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-md",
          className
        )}
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  )
}
