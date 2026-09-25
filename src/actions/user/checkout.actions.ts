'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'
import crypto from 'crypto'

export async function processCheckout(
  userId: string,
  items: any[],
  form: {
    receiver_name: string
    receiver_phone: string
    receiver_address: string
    note: string
  },
  couponCode?: string | null,
  totalAmount?: number,
  discountAmount?: number,
  finalAmount?: number,
  clientRequestIdempotencyKey?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      throw new Error('Xác thực người mua không hợp lệ')
    }

    if (!items || items.length === 0) {
      throw new Error('Giỏ hàng trống, không thể thanh toán')
    }

    // Generate or use deterministic Idempotency Key per checkout attempt
    const idempotencyKey = clientRequestIdempotencyKey || crypto.randomUUID()
    const payloadToHash = JSON.stringify({ userId, items: items.map(i => ({ id: i.id, variantId: i.variantId, qty: i.quantity })), form })
    const requestHash = crypto.createHash('sha256').update(payloadToHash).digest('hex')

    // Format items payload for atomic RPC
    const rpcItemsPayload = items.map(item => ({
      product_id: item.id,
      variant_id: item.variantId || null,
      quantity: item.quantity
    }))

    // Call atomic C2C checkout RPC (17 steps automated in single Postgres transaction)
    const { data: orderId, error: rpcError } = await supabase.rpc('atomic_c2c_checkout', {
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
      p_items: rpcItemsPayload,
      p_receiver_name: form.receiver_name,
      p_receiver_phone: form.receiver_phone,
      p_receiver_address: form.receiver_address,
      p_note: form.note || '',
      p_coupon_code: couponCode || null
    })

    if (rpcError) {
      throw new Error(rpcError.message || 'Lỗi khi xử lý thanh toán tự động')
    }

    // Invalidate product cache & storefront tags
    revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max')
    revalidatePath('/')
    revalidatePath('/san-pham')

    // Invalidate product details for purchased items if slug available
    for (const item of items) {
      if (item.slug) {
        revalidatePath(`/san-pham/${item.slug}`)
      }
    }

    // Invalidate buyer and seller portal pages
    revalidatePath('/tai-khoan')
    revalidatePath('/tai-khoan/don-hang')
    revalidatePath('/tai-khoan/don-ban')
    revalidatePath('/tai-khoan/san-pham-cua-toi')
    revalidatePath('/tai-khoan/doanh-thu')
    revalidatePath('/tai-khoan/chia-tien')
    revalidatePath('/tai-khoan/lich-su-giao-dich')
    revalidatePath('/tai-khoan/lich-su-chung')
    revalidatePath('/tai-khoan/nap-tien')
    revalidatePath('/admin/orders')
    revalidatePath('/admin/products')
    
    return { success: true, data: orderId }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi xử lý thanh toán' }
  }
}

