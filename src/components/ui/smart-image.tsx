'use client'

import { useState, CSSProperties, useEffect } from 'react'
import Image from 'next/image'

export type SmartImageProps = {
  productId?: string | null;
  src?: string | null;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  sizes?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
  objectFit?: CSSProperties["objectFit"];
};

export function SmartImage({ 
  productId,
  src, 
  alt, 
  className = '',
  width,
  height,
  fill = false,
  sizes,
  loading,
  priority = false,
  objectFit,
}: SmartImageProps) {
  const [hasError, setHasError] = useState(false)
  const [reported, setReported] = useState(false)

  // Reset state if src changes
  useEffect(() => {
    setHasError(false)
    setReported(false)
  }, [src])

  const fallbackSrc = '/images/product-placeholder.png';
  const effectiveSrc = hasError || !src ? fallbackSrc : src;

  const handleError = () => {
    // If the fallback itself fails, do nothing to prevent infinite loops
    if (effectiveSrc === fallbackSrc) return;
    
    if (!hasError) {
      setHasError(true);
    }

    if (productId && !reported) {
      setReported(true);
      fetch('/api/images/report-broken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      }).catch(console.error);
    }
  }

  // Determine width/height parsing
  const numericWidth = width ? parseInt(String(width), 10) || 500 : 500;
  const numericHeight = height ? parseInt(String(height), 10) || 500 : 500;

  return (
    <Image
      src={effectiveSrc}
      alt={alt}
      className={className}
      sizes={sizes}
      style={objectFit ? { objectFit } : undefined}
      priority={priority}
      loading={priority ? undefined : (loading || 'lazy')}
      onError={handleError}
      fill={fill}
      width={fill ? undefined : numericWidth}
      height={fill ? undefined : numericHeight}
    />
  )
}
