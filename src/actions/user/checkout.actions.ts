'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processCheckout(
  userId: string,
  items: any[],
  form: {
    receiver_name: string
    receiver_phone: string
    receiver_address: string
    note: string
  },
  couponCode: string | null,
  totalAmount: number,
  discountAmount: number,
  finalAmount: number
) {
  try {
    const supabase = await createClient()

    // 1. Sync cart to database
    // First clear old cart
    await supabase.from('carts').delete().eq('user_id', userId)

    // Insert new cart
    const cartInserts = items.map(item => ({
      user_id: userId,
      product_id: item.id,
      variant_id: item.variantId || null,
      quantity: item.quantity
    }))

    const { error: cartError } = await supabase.from('carts').insert(cartInserts)
    if (cartError) throw new Error('Không thể đồng bộ giỏ hàng')

    // 2. Generate Order Code
    const orderCode = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`

    // 3. Call RPC checkout
    const { data: orderId, error: rpcError } = await supabase.rpc('checkout', {
      p_user_id: userId,
      p_order_code: orderCode,
      p_total_amount: totalAmount,
      p_discount_amount: discountAmount,
      p_final_amount: finalAmount,
      p_receiver_name: form.receiver_name,
      p_receiver_phone: form.receiver_phone,
      p_receiver_address: form.receiver_address,
      p_note: form.note || ''
    })

    if (rpcError) {
      throw new Error(rpcError.message || 'Lỗi khi thanh toán')
    }

    // 4. Clear cart after successful checkout
    await supabase.from('carts').delete().eq('user_id', userId)

    revalidatePath('/tai-khoan/don-hang')
    revalidatePath('/admin/orders')
    
    return { success: true, data: orderId }
  } catch (err: unknown) {
    const error = err as any
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi xử lý thanh toán' }
  }
}
