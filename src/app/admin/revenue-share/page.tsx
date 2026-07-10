import { createAdminClient } from '@/lib/supabase/admin'
import { getRevenueRulesAction } from '@/actions/admin/revenue-share.actions'
import { RevenueShareClient } from '@/features/admin/revenue-share/components/RevenueShareClient'

export const revalidate = 0

export default async function AdminRevenueSharePage() {
  const supabase = createAdminClient()
  
  // 1. Fetch all active products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, category_id')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  // 1.5 Fetch all categories for filtering
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  // 2. Fetch all active variants
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, name, price, product_id')
    .eq('is_active', true)
    .order('name', { ascending: true })

  // 3. Fetch all profiles for recipient options
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .order('full_name', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chia tiền sản phẩm</h1>
        <p className="text-slate-500 mt-1">Phân chia chi phí sản phẩm trực tiếp và khấu trừ số dư ví thành viên.</p>
      </div>

      <RevenueShareClient
        products={products || []}
        categories={categories || []}
        variants={variants || []}
        users={users || []}
      />
    </div>
  )
}
