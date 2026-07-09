import { notFound } from 'next/navigation'
import { ProductService } from '@/services/product.service'
import { ProductDetailClient } from '@/features/products/components/ProductDetailClient'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = await params

  try {
    const product = await ProductService.getProductBySlug(resolvedParams.slug)
    
    if (!product) {
      notFound()
    }

    let isFavorited = false
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single()
      if (data) isFavorited = true
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <ProductDetailClient product={product} variants={product.variants || []} initialFavorited={isFavorited} />
      </div>
    )
  } catch (error) {
    notFound()
  }
}
