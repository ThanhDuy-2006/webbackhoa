'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function authenticateAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    throw new Error('Chỉ Admin mới có quyền truy cập cấu hình phí sàn')
  }

  return { user, supabase }
}

export async function getMarketplaceSettingsAction() {
  try {
    const { supabase } = await authenticateAdmin()
    const { data } = await supabase.from('marketplace_settings').select('*').eq('id', 'default').single()

    return {
      success: true,
      settings: data || { id: 'default', platform_fee_bps: 0 }
    }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

export async function updateMarketplaceFeeAction(platformFeeBps: number) {
  try {
    const { user, supabase } = await authenticateAdmin()

    if (platformFeeBps < 0 || platformFeeBps > 10000) {
      throw new Error('Phí sàn không hợp lệ. Phí sàn phải nằm trong khoảng từ 0% đến 100% (0 đến 10000 BPS)')
    }

    const { data: oldSetting } = await supabase.from('marketplace_settings').select('platform_fee_bps').eq('id', 'default').single()
    const prevBps = oldSetting?.platform_fee_bps ?? 0

    const { error } = await supabase
      .from('marketplace_settings')
      .upsert({
        id: 'default',
        platform_fee_bps: platformFeeBps,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })

    if (error) throw new Error(error.message)

    // Audit Log
    await supabase.from('audit_logs').insert([{
      actor_id: user.id,
      action: 'update_marketplace_fee',
      target_table: 'marketplace_settings',
      target_id: 'default',
      payload: { previous_fee_bps: prevBps, new_fee_bps: platformFeeBps }
    }])

    revalidatePath('/admin/settings/marketplace')
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}
