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
    throw new Error('Chỉ Admin mới có quyền duyệt yêu cầu rút tiền')
  }

  return { user, supabase }
}

export async function processSellerPayoutAction(withdrawalId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
  try {
    const { user, supabase } = await authenticateAdmin()

    // Lock withdrawal request
    const { data: withdrawal, error: fetchError } = await supabase
      .from('seller_withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single()

    if (fetchError || !withdrawal) {
      throw new Error('Không tìm thấy yêu cầu rút tiền')
    }

    if (withdrawal.status !== 'pending') {
      throw new Error('Yêu cầu rút tiền này đã được xử lý từ trước')
    }

    // Lock seller wallet
    const { data: wallet, error: walletError } = await supabase
      .from('seller_wallets')
      .select('*')
      .eq('seller_id', withdrawal.seller_id)
      .single()

    if (walletError || !wallet) {
      throw new Error('Không tìm thấy ví người bán')
    }

    if (status === 'approved') {
      // Move reserved -> withdrawn
      await supabase
        .from('seller_wallets')
        .update({
          reserved_balance: GREATEST(0, wallet.reserved_balance - withdrawal.amount),
          withdrawn_balance: wallet.withdrawn_balance + withdrawal.amount,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', withdrawal.seller_id)

      await supabase.from('seller_ledger_transactions').insert([{
        seller_id: withdrawal.seller_id,
        type: 'withdrawal_completed',
        amount: withdrawal.amount,
        balance_before: wallet.reserved_balance,
        balance_after: wallet.reserved_balance - withdrawal.amount,
        description: `Duyệt rút tiền #${withdrawal.id.slice(0, 8)} thành công`
      }])
    } else {
      // Move reserved -> available (Refund reserved funds back to seller)
      await supabase
        .from('seller_wallets')
        .update({
          reserved_balance: GREATEST(0, wallet.reserved_balance - withdrawal.amount),
          available_balance: wallet.available_balance + withdrawal.amount,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', withdrawal.seller_id)

      await supabase.from('seller_ledger_transactions').insert([{
        seller_id: withdrawal.seller_id,
        type: 'withdrawal_rejected',
        amount: withdrawal.amount,
        balance_before: wallet.available_balance,
        balance_after: wallet.available_balance + withdrawal.amount,
        description: `Từ chối rút tiền #${withdrawal.id.slice(0, 8)}. Lý do: ${rejectionReason || 'Không có lý do'}`
      }])
    }

    // Update withdrawal record
    await supabase
      .from('seller_withdrawals')
      .update({
        status,
        rejection_reason: rejectionReason || null,
        processed_by: user.id,
        processed_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)

    revalidatePath('/admin/settings/marketplace')
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

function GREATEST(a: number, b: number): number {
  return Math.max(a, b)
}
