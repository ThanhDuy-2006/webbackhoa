import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const revalidate = 60

export default async function KhuyenMaiPage() {
  const supabase = createAdminClient()
  
  // Fetch active coupons
  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .gte('end_date', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Khuyến mãi</h1>
        <p className="mt-2 text-slate-600">Tổng hợp các chương trình ưu đãi và mã giảm giá mới nhất.</p>
      </div>

      {(!coupons || coupons.length === 0) ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-500">Hiện tại chưa có chương trình khuyến mãi nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="border-emerald-100 overflow-hidden">
              <div className="bg-emerald-600 text-white p-4 text-center">
                <h3 className="font-bold text-2xl tracking-wider">{coupon.code}</h3>
                <p className="text-emerald-100 text-sm mt-1">
                  Giảm {coupon.type === 'percent' ? `${coupon.value}%` : `${Number(coupon.value).toLocaleString('vi-VN')} VND`}
                </p>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Đơn tối thiểu:</span>
                  <span className="font-medium">{Number(coupon.min_order_amount).toLocaleString('vi-VN')} VND</span>
                </div>
                {coupon.max_discount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Giảm tối đa:</span>
                    <span className="font-medium">{Number(coupon.max_discount).toLocaleString('vi-VN')} VND</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Hạn sử dụng:</span>
                  <span className="font-medium">{new Date(coupon.end_date).toLocaleDateString('vi-VN')}</span>
                </div>
                {coupon.usage_limit && (
                  <div className="flex justify-between text-sm pt-2 border-t mt-2">
                    <span className="text-slate-500">Đã dùng:</span>
                    <span className="font-medium">{coupon.used_count} / {coupon.usage_limit}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
