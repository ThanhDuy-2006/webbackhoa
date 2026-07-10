import { createAdminClient } from '@/lib/supabase/admin'
import { getRevenueRulesAction } from '@/actions/admin/revenue-share.actions'
import { RevenueShareClient } from '@/features/admin/revenue-share/components/RevenueShareClient'

export const revalidate = 0

export default async function AdminRevenueSharePage() {
  const supabase = createAdminClient()
  
  // 1. Fetch all active products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price')
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

  // 4. Fetch existing rules
  const rulesResult = await getRevenueRulesAction()
  const initialRules = rulesResult.success ? rulesResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chia tiền sản phẩm</h1>
        <p className="text-slate-500 mt-1">Cấu hình chia sẻ doanh thu và nạp tiền tự động cho các thành viên từ việc bán sản phẩm.</p>
      </div>

      <RevenueShareClient
        products={products || []}
        variants={variants || []}
        users={users || []}
        initialRules={initialRules || []}
      />
    </div>
  )
}
