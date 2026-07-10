import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/features/products/components/ProductCard'
import { RecentlyViewed } from '@/components/products/RecentlyViewed'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'


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
    <div className="bg-[#fcfcfc] dark:bg-slate-950 min-h-screen pb-24 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10 lg:space-y-16 py-8">
        
        {/* 1. Swipe Banner */}
        <section className="relative overflow-hidden rounded-[24px] bg-slate-100 dark:bg-slate-900 aspect-[21/9] md:aspect-[3/1] max-w-full shadow-sm border border-slate-200/50 dark:border-slate-800">
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none h-full w-full">
            {/* Slide 1 */}
            <div className="flex-shrink-0 w-full h-full snap-start relative bg-emerald-950 text-white flex items-center p-6 sm:p-12 md:p-16">
              <div className="space-y-2 md:space-y-4 max-w-md sm:max-w-lg z-10">
                <span className="bg-emerald-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Khuyến mãi cực hot</span>
                <h3 className="text-lg sm:text-2xl md:text-4xl font-extrabold tracking-tight">Rau củ hữu cơ tươi ngon giảm tới 30%</h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-emerald-100/90">Được thu hoạch từ nông trại organic Đà Lạt, an toàn cho cả gia đình.</p>
                <Link href="/san-pham?category=rau-cu-qua" className="inline-block bg-white text-emerald-900 text-[10px] sm:text-xs md:text-sm font-bold px-5 py-2.5 rounded-full hover:bg-emerald-50 transition-colors shadow-sm cursor-pointer" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Mua ngay</Link>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block opacity-90">
                <ProgressiveImage src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80" alt="Fresh vegetables" fill className="object-cover object-center" />
              </div>
            </div>
            {/* Slide 2 */}
            <div className="flex-shrink-0 w-full h-full snap-start relative bg-orange-950 text-white flex items-center p-6 sm:p-12 md:p-16">
              <div className="space-y-2 md:space-y-4 max-w-md sm:max-w-lg z-10">
                <span className="bg-orange-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Tươi sống mỗi ngày</span>
                <h3 className="text-lg sm:text-2xl md:text-4xl font-extrabold tracking-tight">Thịt cá sạch chuẩn VietGAP giảm 20%</h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-orange-100/90">Bảo quản lạnh khép kín tiêu chuẩn xuất khẩu, giao nhanh 2h.</p>
                <Link href="/san-pham?category=thit-ca" className="inline-block bg-white text-orange-800 text-[10px] sm:text-xs md:text-sm font-bold px-5 py-2.5 rounded-full hover:bg-orange-50 transition-colors shadow-sm cursor-pointer" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Mua ngay</Link>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block opacity-90">
                <ProgressiveImage src="https://images.unsplash.com/photo-1543083503-047cb2be608c?auto=format&fit=crop&w=800&q=80" alt="Fresh meat" fill className="object-cover object-center" />
              </div>
            </div>
          </div>
        </section>


        {/* 2. Categories Grid */}
        <section>
          {categories && categories.length > 0 ? (
            <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-4 lg:gap-6 pb-4 md:pb-0 scrollbar-none snap-x">
              {categories.map((cat) => (
                <Link href={`/san-pham?category=${cat.slug}`} key={cat.id} className="group outline-none shrink-0 w-[130px] md:w-auto snap-start" style={{ minHeight: '44px' }}>
                  <div className="bg-white rounded-[24px] p-5 flex flex-col items-center justify-center text-center gap-3 transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 h-full">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative">
                      {cat.image_url ? (
                        <Image src={cat.image_url} alt={cat.name} width={64} height={64} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-200 rounded-full" />
                      )}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-1">
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

        {/* 4. Recently Viewed */}
        <RecentlyViewed />

      </div>
    </div>
  )
}
