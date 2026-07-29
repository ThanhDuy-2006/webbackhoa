'use server'

import { createClient } from '@/lib/supabase/server'
import { QuickViewProduct } from '@/types/product.type'

export async function getProductQuickViewAction(id: string): Promise<QuickViewProduct | null> {
  if (!id || typeof id !== 'string') return null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, price, sale_price, stock, image_url, images, description, category_id, variants:product_variants(id, name, price, stock, is_active)')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) return null

    // Filter only active variants for public storefront
    const activeVariants = (data.variants || []).filter((v: any) => v.is_active !== false)

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      price: Number(data.price),
      sale_price: data.sale_price ? Number(data.sale_price) : null,
      stock: Number(data.stock),
      image_url: data.image_url,
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.image_url ? [data.image_url] : []),
      description: data.description || null,
      category_id: data.category_id,
      variants: activeVariants.map((v: any) => ({
        id: v.id,
        name: v.name,
        price: v.price ? Number(v.price) : null,
        stock: Number(v.stock),
        is_active: Boolean(v.is_active)
      }))
    }
  } catch (err) {
    console.error('[getProductQuickViewAction] Error:', err)
    return null
  }
}
