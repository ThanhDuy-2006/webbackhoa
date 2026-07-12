'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleWishlist(productId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Vui lòng đăng nhập để thêm vào danh sách yêu thích' }
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single()

    if (existing) {
      // Remove
      await supabase.from('wishlists').delete().eq('id', existing.id)
      revalidatePath('/')
      revalidatePath(`/san-pham/[slug]`, 'page')
      return { success: true, isFavorited: false }
    } else {
      // Add
      await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: productId
      })
      revalidatePath('/')
      revalidatePath(`/san-pham/[slug]`, 'page')
      return { success: true, isFavorited: true }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}
