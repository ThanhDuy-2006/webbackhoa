export interface ProductVariant {
  id: string
  product_id: string
  sku: string | null
  name: string
  price: number | null
  stock: number
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price: number
  sale_price: number | null
  stock: number
  image_url: string | null
  images: string[]
  is_active: boolean
  is_featured: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Smart Image Automation Fields
  image_source: 'auto' | 'manual'
  image_status: 'unchecked' | 'searching' | 'valid' | 'invalid' | 'needs_review'
  image_last_checked_at: string | null
  image_retry_count: number
  image_failed_urls: string[]

  // Relations
  variants?: ProductVariant[]
  category?: { id: string, name: string }
}

