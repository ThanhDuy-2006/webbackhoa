'use client'

import { useState, CSSProperties, useEffect } from 'react'

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

  // Ensure priority maps to eager fetching
  const effectiveLoading = priority ? 'eager' : (loading || 'lazy');
  
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

  // Handle fill prop
  const style: CSSProperties = {};
  
  if (fill) {
    style.position = 'absolute';
    style.top = 0;
    style.left = 0;
    style.width = '100%';
    style.height = '100%';
    style.color = 'transparent';
  } else {
    if (width) style.width = width;
    if (height) style.height = height;
  }

  if (objectFit) {
    style.objectFit = objectFit;
  }

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      sizes={sizes}
      style={style}
      loading={effectiveLoading}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={handleError}
    />
  )
}
