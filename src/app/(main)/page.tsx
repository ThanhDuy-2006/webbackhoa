import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/features/products/components/ProductCard'


export const revalidate = 60

export default async function HomePage() {
  const supabase = createAdminClient()


  // 2. Fetch Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(5)

  // 3. Fetch Products (featured first, then stock, then newest)
  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('stock', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="bg-[#fcfcfc] min-h-screen pb-24">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16 lg:space-y-24 py-8">
        

        {/* 2. Categories Grid */}
        <section>
          {categories && categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 lg:gap-6">
              {categories.map((cat) => (
                <Link href={`/san-pham?category=${cat.slug}`} key={cat.id} className="group outline-none">
                  <div className="bg-white rounded-[24px] p-6 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-200 rounded-full" />
                      )}
                    </div>
                    <span className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
                      {cat.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="w-full h-32 bg-white rounded-[24px] border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
              Chưa có danh mục nào
            </div>
          )}
        </section>

        {/* 3. Featured Products */}
        <section>
          <div className="flex items-end justify-between mb-8 lg:mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sản phẩm nổi bật</h2>
            <Link href="/san-pham" className="text-emerald-600 font-semibold hover:text-emerald-700 hover:underline underline-offset-4 transition-all">
              Xem tất cả →
            </Link>
          </div>
          
          {featuredProducts && featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="w-full h-64 bg-white rounded-[24px] border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
              Chưa có sản phẩm nào
            </div>
          )}
        </section>



      </div>
    </div>
  )
}
