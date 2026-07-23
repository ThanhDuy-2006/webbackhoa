import { notFound } from 'next/navigation'
import { ProductService } from '@/services/product.service'
import { ProductDetailClient } from '@/features/products/components/ProductDetailClient'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = await params

  try {
    const supabase = await createClient()
    const [product, { data: { user } }] = await Promise.all([
      ProductService.getProductBySlug(resolvedParams.slug),
      supabase.auth.getUser()
    ])
    
    if (!product) {
      notFound()
    }

    let isFavorited = false
    if (user) {
      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle()
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
