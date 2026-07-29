'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function authenticateUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này')
  }
  return { user, supabase }
}

export async function getSellerBalanceAction() {
  try {
    const { user, supabase } = await authenticateUser()

    const { data: wallet } = await supabase
      .from('seller_wallets')
      .select('*')
      .eq('seller_id', user.id)
      .single()

    const { data: transactions } = await supabase
      .from('seller_ledger_transactions')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: withdrawals } = await supabase
      .from('seller_withdrawals')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    return {
      success: true,
      wallet: wallet || { pending_balance: 0, available_balance: 0, reserved_balance: 0, withdrawn_balance: 0 },
      transactions: transactions || [],
      withdrawals: withdrawals || []
    }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

export async function requestWithdrawalAction(data: {
  amount: number
  bank_name: string
  account_number: string
  account_name: string
}) {
  try {
    const { user, supabase } = await authenticateUser()

    if (data.amount <= 0) {
      throw new Error('Số tiền rút phải lớn hơn 0')
    }

    if (!data.bank_name || !data.account_number || !data.account_name) {
      throw new Error('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng')
    }

    // Atomic withdrawal reservation transaction
    // Lock wallet row
    const { data: wallet, error: walletError } = await supabase
      .from('seller_wallets')
      .select('*')
      .eq('seller_id', user.id)
      .single()

    if (walletError || !wallet) {
      throw new Error('Không tìm thấy ví người bán')
    }

    if (wallet.available_balance < data.amount) {
      throw new Error(`Số dư khả dụng không đủ. Bạn có ${wallet.available_balance.toLocaleString('vi-VN')}đ nhưng yêu cầu rút ${data.amount.toLocaleString('vi-VN')}đ`)
    }

    // Move available -> reserved
    const { error: updateError } = await supabase
      .from('seller_wallets')
      .update({
        available_balance: wallet.available_balance - data.amount,
        reserved_balance: wallet.reserved_balance + data.amount,
        updated_at: new Date().toISOString()
      })
      .eq('seller_id', user.id)

    if (updateError) throw new Error('Không thể tạm khóa số dư rút tiền')

    // Create withdrawal request
    const { data: withdrawal, error: withdrawError } = await supabase
      .from('seller_withdrawals')
      .insert([{
        seller_id: user.id,
        amount: data.amount,
        bank_name: data.bank_name,
        account_number: data.account_number,
        account_name: data.account_name,
        status: 'pending'
      }])
      .select()
      .single()

    if (withdrawError) throw new Error('Lỗi khi tạo yêu cầu rút tiền')

    // Record ledger transaction
    await supabase.from('seller_ledger_transactions').insert([{
      seller_id: user.id,
      type: 'withdrawal_reserved',
      amount: -data.amount,
      balance_before: wallet.available_balance,
      balance_after: wallet.available_balance - data.amount,
      description: `Yêu cầu rút tiền #${withdrawal.id.slice(0, 8)} - Chờ Admin chuyển khoản`
    }])

    revalidatePath('/tai-khoan/doanh-thu')
    revalidatePath('/tai-khoan/rut-tien')
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

export async function confirmBuyerOrderReceiptAction(sellerOrderId: string) {
  try {
    const { user, supabase } = await authenticateUser()

    const { data, error } = await supabase.rpc('complete_seller_order', {
      p_seller_order_id: sellerOrderId,
      p_actor_id: user.id
    })

    if (error) throw new Error(error.message)

    revalidatePath('/tai-khoan/don-hang')
    revalidatePath('/tai-khoan/don-ban')
    revalidatePath('/tai-khoan/doanh-thu')
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}
