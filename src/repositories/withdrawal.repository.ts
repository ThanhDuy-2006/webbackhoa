import { createClient } from '@/lib/supabase/server'
import { WithdrawalRequest, WithdrawalFilter } from '@/types/withdrawal.type'

export const WithdrawalRepository = {
  async getWithdrawalRequests(filter?: WithdrawalFilter) {
    const supabase = await createClient()
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        profiles:user_id(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filter?.status && filter.status !== 'all') {
      query = query.eq('status', filter.status)
    }

    if (filter?.userId) {
      query = query.eq('user_id', filter.userId)
    }

    if (filter?.search) {
      const s = filter.search.trim()
      query = query.or(`bank_name.ilike.%${s}%,account_number.ilike.%${s}%,account_name.ilike.%${s}%`)
    }

    if (filter?.page && filter?.limit) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Lỗi khi lấy danh sách yêu cầu rút tiền:', error)
      return { data: [], count: 0 }
    }

    return { 
      data: (data as any) as WithdrawalRequest[], 
      count: count || 0 
    }
  },

  async getUserWithdrawals(userId: string, limit = 50) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Lỗi khi lấy lịch sử rút tiền người dùng:', error)
      return []
    }

    return (data as any) as WithdrawalRequest[]
  },

  async submitWithdrawal(data: {
    amount: number
    bank_name: string
    account_number: string
    account_name: string
  }) {
    const supabase = await createClient()
    
    // 1. Thử gọi RPC atomic
    const { data: rpcData, error: rpcError } = await supabase.rpc('request_wallet_withdrawal', {
      p_amount: data.amount,
      p_bank_name: data.bank_name,
      p_account_number: data.account_number,
      p_account_name: data.account_name
    })

    if (!rpcError && rpcData) {
      return rpcData as { success: boolean; error?: string; withdrawal_id?: string; new_balance?: number }
    }

    // 2. Fallback nếu RPC chưa chạy trong database
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập' }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) return { success: false, error: 'Không tìm thấy hồ sơ người dùng' }
    if ((profile.balance || 0) < data.amount) {
      return { success: false, error: 'Số dư khả dụng trong ví không đủ' }
    }

    const newBalance = profile.balance - data.amount

    // Update balance
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateErr) return { success: false, error: 'Không thể cập nhật số dư' }

    const bankName = data.bank_name?.trim() || 'Chưa cung cấp'
    const accNum = data.account_number?.trim() || 'Chưa cung cấp'
    const accName = data.account_name?.trim() ? data.account_name.trim().toUpperCase() : 'Chưa cung cấp'

    // Insert withdrawal request
    const { data: inserted, error: insertErr } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        amount: data.amount,
        bank_name: bankName,
        account_number: accNum,
        account_name: accName,
        status: 'pending'
      })
      .select()
      .single()

    if (insertErr) {
      // Refund if insert failed
      await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id)
      return { success: false, error: insertErr.message }
    }

    // Insert wallet transaction
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount: -data.amount,
      balance_before: profile.balance,
      balance_after: newBalance,
      related_withdrawal_id: inserted.id,
      note: `Yêu cầu rút tiền về ${data.bank_name} (${data.account_number})`
    })

    return { success: true, withdrawal_id: inserted.id, new_balance: newBalance }
  },

  async approveWithdrawal(withdrawalId: string, adminId: string, adminNote?: string) {
    const supabase = await createClient()

    // 1. Thử gọi RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('approve_withdrawal_request', {
      p_withdrawal_id: withdrawalId,
      p_admin_id: adminId,
      p_admin_note: adminNote || null
    })

    if (!rpcError && rpcData) {
      return rpcData as { success: boolean; error?: string }
    }

    // 2. Fallback direct update
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'approved',
        admin_note: adminNote || null,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)
      .eq('status', 'pending')

    if (error) {
      console.error('Lỗi khi duyệt rút tiền:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  },

  async rejectWithdrawal(withdrawalId: string, adminId: string, adminNote: string) {
    const supabase = await createClient()

    // 1. Thử gọi RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('reject_withdrawal_request', {
      p_withdrawal_id: withdrawalId,
      p_admin_id: adminId,
      p_admin_note: adminNote
    })

    if (!rpcError && rpcData) {
      return rpcData as { success: boolean; error?: string }
    }

    // 2. Fallback refund
    const { data: req, error: fetchErr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .eq('status', 'pending')
      .single()

    if (fetchErr || !req) {
      return { success: false, error: 'Không tìm thấy yêu cầu rút tiền hợp lệ' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', req.user_id)
      .single()

    const currentBalance = profile?.balance || 0
    const newBalance = currentBalance + req.amount

    // Update status
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        admin_note: adminNote,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)

    // Refund profile
    await supabase
      .from('profiles')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', req.user_id)

    // Record wallet transaction
    await supabase.from('wallet_transactions').insert({
      user_id: req.user_id,
      type: 'withdrawal_refund',
      amount: req.amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      related_withdrawal_id: req.id,
      note: `Hoàn tiền yêu cầu rút: ${adminNote}`
    })

    return { success: true }
  }
}
