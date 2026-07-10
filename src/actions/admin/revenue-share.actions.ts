'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to verify admin session
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Không có quyền truy cập')
  }

  return { user, profile }
}

export async function getRevenueRulesAction() {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()

    // Fetch rules with product and variant details
    const { data: rules, error } = await supabase
      .from('product_revenue_rules')
      .select(`
        *,
        products (id, name, price),
        product_variants (id, name, price, product_id)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch recipients for all rules
    const rulesWithRecipients = await Promise.all(
      rules.map(async (rule) => {
        const { data: recipients, error: rError } = await supabase
          .from('product_revenue_recipients')
          .select(`
            *,
            profiles:user_id (id, full_name, email)
          `)
          .eq('rule_id', rule.id)

        if (rError) throw rError

        return {
          ...rule,
          recipients: recipients || []
        }
      })
    )

    return { success: true, data: rulesWithRecipients }
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách luật chia tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function saveRevenueRuleAction(data: {
  id?: string
  product_id?: string | null
  variant_id?: string | null
  sharing_method: 'equal' | 'percentage' | 'fixed'
  status: 'draft' | 'active' | 'paused' | 'expired'
  start_date?: string | null
  end_date?: string | null
  recipients: {
    user_id: string
    percentage?: number | null
    fixed_amount?: number | null
  }[]
}) {
  try {
    const { user: admin, profile: adminProfile } = await verifyAdmin()
    const supabase = createAdminClient()

    // 1. Basic validation
    if (!data.product_id && !data.variant_id) {
      return { success: false, error: 'Vui lòng chọn sản phẩm hoặc phân loại' }
    }
    if (data.recipients.length === 0) {
      return { success: false, error: 'Vui lòng chọn ít nhất một người nhận' }
    }

    // 2. Validate recipients uniqueness
    const userIds = data.recipients.map(r => r.user_id)
    const uniqueUserIds = new Set(userIds)
    if (uniqueUserIds.size !== userIds.length) {
      return { success: false, error: 'Một người nhận không thể xuất hiện nhiều lần trong cùng một luật' }
    }

    // 3. Method-specific validations
    if (data.sharing_method === 'percentage') {
      const totalPercentage = data.recipients.reduce((sum, r) => sum + (r.percentage || 0), 0)
      if (Math.round(totalPercentage) !== 100) {
        return { success: false, error: 'Tổng tỷ lệ phần trăm của người nhận phải bằng đúng 100%' }
      }
    } else if (data.sharing_method === 'fixed') {
      for (const r of data.recipients) {
        if (!r.fixed_amount || r.fixed_amount <= 0) {
          return { success: false, error: 'Số tiền cố định của mỗi người nhận phải lớn hơn 0' }
        }
      }
    }

    // 4. Save/Update Rule
    let ruleId = data.id
    if (ruleId) {
      const { error: uError } = await supabase
        .from('product_revenue_rules')
        .update({
          product_id: data.product_id || null,
          variant_id: data.variant_id || null,
          sharing_method: data.sharing_method,
          status: data.status,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)

      if (uError) throw uError
    } else {
      // Check if product/variant rule already exists
      if (data.variant_id) {
        const { data: existing } = await supabase
          .from('product_revenue_rules')
          .select('id')
          .eq('variant_id', data.variant_id)
          .maybeSingle()
        if (existing) return { success: false, error: 'Đã có cấu hình chia tiền cho phân loại này' }
      } else if (data.product_id) {
        const { data: existing } = await supabase
          .from('product_revenue_rules')
          .select('id')
          .eq('product_id', data.product_id)
          .maybeSingle()
        if (existing) return { success: false, error: 'Đã có cấu hình chia tiền cho sản phẩm này' }
      }

      const { data: newRule, error: iError } = await supabase
        .from('product_revenue_rules')
        .insert({
          product_id: data.product_id || null,
          variant_id: data.variant_id || null,
          sharing_method: data.sharing_method,
          status: data.status,
          start_date: data.start_date || null,
          end_date: data.end_date || null
        })
        .select()
        .single()

      if (iError) throw iError
      ruleId = newRule.id
    }

    // 5. Recreate recipients list (Delete existing and insert new ones)
    const { error: dError } = await supabase
      .from('product_revenue_recipients')
      .delete()
      .eq('rule_id', ruleId)

    if (dError) throw dError

    const recipientsToInsert = data.recipients.map(r => ({
      rule_id: ruleId,
      user_id: r.user_id,
      percentage: data.sharing_method === 'percentage' ? r.percentage : null,
      fixed_amount: data.sharing_method === 'fixed' ? r.fixed_amount : null
    }))

    const { error: insError } = await supabase
      .from('product_revenue_recipients')
      .insert(recipientsToInsert)

    if (insError) throw insError

    // 6. Write Audit Log
    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: data.id ? 'update_revenue_rule' : 'create_revenue_rule',
      target_table: 'product_revenue_rules',
      target_id: ruleId,
      metadata: {
        admin_name: adminProfile?.full_name || admin.email,
        sharing_method: data.sharing_method,
        status: data.status,
        recipients_count: data.recipients.length
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true, ruleId }
  } catch (error: any) {
    console.error('Lỗi khi lưu cấu hình chia tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function copyRevenueRuleAction(sourceRuleId: string, data: {
  product_id?: string | null
  variant_id?: string | null
}) {
  try {
    const { user: admin, profile: adminProfile } = await verifyAdmin()
    const supabase = createAdminClient()

    if (!data.product_id && !data.variant_id) {
      return { success: false, error: 'Vui lòng chọn đích sao chép (Sản phẩm hoặc phân loại)' }
    }

    // Load source rule
    const { data: sourceRule, error: srError } = await supabase
      .from('product_revenue_rules')
      .select('*')
      .eq('id', sourceRuleId)
      .single()

    if (srError) throw srError

    // Load source recipients
    const { data: sourceRecipients, error: srecError } = await supabase
      .from('product_revenue_recipients')
      .select('*')
      .eq('rule_id', sourceRuleId)

    if (srecError) throw srecError

    // Verify existing target rule
    if (data.variant_id) {
      const { data: existing } = await supabase
        .from('product_revenue_rules')
        .select('id')
        .eq('variant_id', data.variant_id)
        .maybeSingle()
      if (existing) return { success: false, error: 'Đã có cấu hình chia tiền cho phân loại này' }
    } else if (data.product_id) {
      const { data: existing } = await supabase
        .from('product_revenue_rules')
        .select('id')
        .eq('product_id', data.product_id)
        .maybeSingle()
      if (existing) return { success: false, error: 'Đã có cấu hình chia tiền cho sản phẩm này' }
    }

    // Insert target rule
    const { data: newRule, error: insError } = await supabase
      .from('product_revenue_rules')
      .insert({
        product_id: data.product_id || null,
        variant_id: data.variant_id || null,
        sharing_method: sourceRule.sharing_method,
        status: sourceRule.status,
        start_date: sourceRule.start_date,
        end_date: sourceRule.end_date
      })
      .select()
      .single()

    if (insError) throw insError

    // Insert target recipients
    const newRecipients = sourceRecipients.map(r => ({
      rule_id: newRule.id,
      user_id: r.user_id,
      percentage: r.percentage,
      fixed_amount: r.fixed_amount
    }))

    const { error: insRecError } = await supabase
      .from('product_revenue_recipients')
      .insert(newRecipients)

    if (insRecError) throw insRecError

    // Write Audit Log
    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'copy_revenue_rule',
      target_table: 'product_revenue_rules',
      target_id: newRule.id,
      metadata: {
        admin_name: adminProfile?.full_name || admin.email,
        source_rule_id: sourceRuleId,
        sharing_method: sourceRule.sharing_method
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true, ruleId: newRule.id }
  } catch (error: any) {
    console.error('Lỗi khi sao chép cấu hình:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function deleteRevenueRuleAction(id: string) {
  try {
    const { user: admin, profile: adminProfile } = await verifyAdmin()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('product_revenue_rules')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Write Audit Log
    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'delete_revenue_rule',
      target_table: 'product_revenue_rules',
      target_id: id,
      metadata: {
        admin_name: adminProfile?.full_name || admin.email
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true }
  } catch (error: any) {
    console.error('Lỗi khi xóa cấu hình chia tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function getRevenueSharesHistoryAction(filters?: {
  productId?: string
  userId?: string
  orderCode?: string
  startDate?: string
  endDate?: string
}) {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()

    let query = supabase
      .from('product_revenue_shares')
      .select(`
        *,
        wallet_transactions (id, note)
      `)
      .order('created_at', { ascending: false })

    if (filters?.productId) {
      // Find rules for that product
      const { data: rules } = await supabase
        .from('product_revenue_rules')
        .select('id')
        .or(`product_id.eq.${filters.productId},variant_id.in.(select id from product_variants where product_id = ${filters.productId})`)
      
      const ruleIds = rules?.map(r => r.id) || []
      if (ruleIds.length > 0) {
        query = query.in('rule_id', ruleIds)
      } else {
        return { success: true, data: [] }
      }
    }

    if (filters?.userId) {
      query = query.eq('recipient_id', filters.userId)
    }

    if (filters?.orderCode) {
      query = query.ilike('order_code_snapshot', `%${filters.orderCode}%`)
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const { data, error } = await query
    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Lỗi khi lấy lịch sử chia tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function getRevenueShareStatsAction() {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()

    // 1. Fetch all completed shares
    const { data: shares, error } = await supabase
      .from('product_revenue_shares')
      .select('*')
    
    if (error) throw error

    let totalAmount = 0
    let todayAmount = 0
    let thisMonthAmount = 0

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Products breakdown map
    const productStatsMap: Record<string, number> = {}
    // Recipients breakdown map
    const recipientStatsMap: Record<string, { name: string; amount: number; email?: string }> = {}

    shares?.forEach(s => {
      const amt = Number(s.amount) // amount is positive for credit, negative for reversal/refund
      totalAmount += amt

      const createdAtDate = new Date(s.created_at)
      const createdStr = s.created_at.split('T')[0]
      
      if (createdStr === todayStr) {
        todayAmount += amt
      }

      if (createdAtDate.getMonth() === currentMonth && createdAtDate.getFullYear() === currentYear) {
        thisMonthAmount += amt
      }

      // Group by Product Name
      productStatsMap[s.product_name_snapshot] = (productStatsMap[s.product_name_snapshot] || 0) + amt

      // Group by Recipient
      if (!recipientStatsMap[s.recipient_id]) {
        recipientStatsMap[s.recipient_id] = {
          name: s.recipient_name_snapshot,
          amount: 0
        }
      }
      recipientStatsMap[s.recipient_id].amount += amt
    })

    // Sort top products
    const topProducts = Object.entries(productStatsMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Sort top recipients
    const topRecipients = Object.entries(recipientStatsMap)
      .map(([id, data]) => ({ id, name: data.name, amount: data.amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    return {
      success: true,
      data: {
        totalAmount,
        todayAmount,
        thisMonthAmount,
        topProducts,
        topRecipients
      }
    }
  } catch (error: any) {
    console.error('Lỗi khi lấy thống kê chia tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}
