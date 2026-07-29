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

  // C2C Marketplace Fields
  seller_id?: string | null
  product_source?: 'platform' | 'seller'
  listing_status?: 'draft' | 'active' | 'paused' | 'suspended' | 'deleted'
  suspension_reason?: string | null

  // Relations
  variants?: ProductVariant[]
  category?: { id: string, name: string }
  seller_profile?: { full_name: string | null; email: string | null }
}

export interface StorefrontProductSummary {
  id: string
  name: string
  slug: string
  price: number
  sale_price: number | null
  stock: number
  image_url: string | null
  category_id: string | null
  is_featured: boolean
  categories?: { slug: string; name?: string } | { slug: string }[] | null
}

export interface QuickViewProduct {
  id: string
  name: string
  slug: string
  price: number
  sale_price: number | null
  stock: number
  image_url: string | null
  images: string[]
  description: string | null
  category_id: string | null
  variants: {
    id: string
    name: string
    price: number | null
    stock: number
    is_active: boolean
  }[]
}
