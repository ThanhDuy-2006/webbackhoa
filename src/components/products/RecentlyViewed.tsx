'use client'

import React, { useEffect, useState } from 'react'
import { ProductCard } from '@/features/products/components/ProductCard'
import { History } from 'lucide-react'

export function RecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recently_viewed')
      if (stored) {
        setRecentlyViewed(JSON.parse(stored))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  if (recentlyViewed.length === 0) return null

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-slate-100">
          Sản phẩm đã xem gần đây
        </h3>
      </div>
      
      <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-none snap-x md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:pb-0">
        {recentlyViewed.map((product) => (
          <div key={product.id} className="w-[180px] shrink-0 snap-start md:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
export function addRecentlyViewed(product: any) {
  if (typeof window === 'undefined' || !product) return
  try {
    const stored = localStorage.getItem('recently_viewed')
    let list = stored ? JSON.parse(stored) : []
    
    // Remove existing if duplicate
    list = list.filter((p: any) => p.id !== product.id)
    
    // Add to beginning of list
    list.unshift({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      sale_price: product.sale_price,
      images: product.images,
      image_url: product.image_url,
      stock: product.stock
    })
    
    // Keep max 6
    if (list.length > 6) {
      list = list.slice(0, 6)
    }
    
    localStorage.setItem('recently_viewed', JSON.stringify(list))
  } catch (e) {
    console.error(e)
  }
}
