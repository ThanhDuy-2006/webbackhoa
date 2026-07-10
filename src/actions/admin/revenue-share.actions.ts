'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to verify user permissions and return role level
async function verifyUserRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, revenue_role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('Không tìm thấy thông tin tài khoản')
  }

  // Force super_admin access if system role is 'admin'
  const resolvedRole = profile.role === 'admin'
    ? 'super_admin'
    : (profile.revenue_role && profile.revenue_role !== 'none' ? profile.revenue_role : 'none')

  if (resolvedRole === 'none') {
    throw new Error('Không có quyền truy cập module chia sẻ doanh thu')
  }

  return { user, profile: { ...profile, revenue_role: resolvedRole } }
}

function checkSuperAdmin(role: string) {
  if (role !== 'super_admin') {
    throw new Error('Chỉ Super Admin mới có quyền thực hiện thao tác này')
  }
}

function checkRevenueManager(role: string) {
  if (role !== 'super_admin' && role !== 'revenue_manager') {
    throw new Error('Chỉ Super Admin hoặc Revenue Manager mới có quyền thực hiện thao tác này')
  }
}

export async function getRevenueRulesAction() {
  try {
    const { profile } = await verifyUserRole() // Viewer role is enough to view rules
    const supabase = createAdminClient()

    // Fetch active/archived rules with product/variant details (deleted_at is handled inside client filtering)
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

    return { success: true, data: rulesWithRecipients, userRevenueRole: profile.revenue_role }
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
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'expired' | 'archived'
  start_date?: string | null
  end_date?: string | null
  recipients: {
    user_id: string
    percentage?: number | null
    fixed_amount?: number | null
  }[]
}) {
  try {
    const { user: admin, profile: adminProfile } = await verifyUserRole()
    checkRevenueManager(adminProfile.revenue_role)
    const supabase = createAdminClient()

    // Basic validation
    if (!data.product_id && !data.variant_id) {
      return { success: false, error: 'Vui lòng chọn sản phẩm hoặc phân loại' }
    }
    if (data.recipients.length === 0) {
      return { success: false, error: 'Vui lòng chọn ít nhất một người nhận' }
    }

    // Validate unique recipients
    const userIds = data.recipients.map(r => r.user_id)
    if (new Set(userIds).size !== userIds.length) {
      return { success: false, error: 'Một người nhận không thể xuất hiện nhiều lần trong cùng một luật' }
    }

    // Method validations
    if (data.sharing_method === 'percentage') {
      const totalPct = data.recipients.reduce((sum, r) => sum + (r.percentage || 0), 0)
      if (Math.round(totalPct) !== 100) {
        return { success: false, error: 'Tổng tỷ lệ phần trăm của người nhận phải bằng đúng 100%' }
      }
    } else if (data.sharing_method === 'fixed') {
      for (const r of data.recipients) {
        if (!r.fixed_amount || r.fixed_amount <= 0) {
          return { success: false, error: 'Số tiền cố định của mỗi người nhận phải lớn hơn 0' }
        }
      }
    }

    let ruleId = data.id
    let version = 1
    let oldValue: any = null

    if (ruleId) {
      // Load old value
      const { data: existingRule } = await supabase
        .from('product_revenue_rules')
        .select('*')
        .eq('id', ruleId)
        .single()

      if (existingRule) {
        const { data: existingRecipients } = await supabase
          .from('product_revenue_recipients')
          .select('*')
          .eq('rule_id', ruleId)
        
        oldValue = { ...existingRule, recipients: existingRecipients || [] }
        version = (existingRule.version || 1) + 1
      }

      // Auto-approve and activate rules saved by any admin
      const resolvedStatus = data.status === 'active' ? 'active' : data.status

      const { error: uError } = await supabase
        .from('product_revenue_rules')
        .update({
          product_id: data.product_id || null,
          variant_id: data.variant_id || null,
          sharing_method: data.sharing_method,
          status: resolvedStatus,
          version: version,
          approved_by: admin.id,
          approved_at: new Date().toISOString(),
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)

      if (uError) throw uError
    } else {
      // Validate unique target for new rules (ignoring archived rules)
      if (data.variant_id) {
        const { data: existing } = await supabase
          .from('product_revenue_rules')
          .select('id')
          .eq('variant_id', data.variant_id)
          .is('deleted_at', null)
          .maybeSingle()
        if (existing) return { success: false, error: 'Đã có cấu hình hoạt động cho phân loại này' }
      } else if (data.product_id) {
        const { data: existing } = await supabase
          .from('product_revenue_rules')
          .select('id')
          .eq('product_id', data.product_id)
          .is('deleted_at', null)
          .maybeSingle()
        if (existing) return { success: false, error: 'Đã có cấu hình hoạt động cho sản phẩm này' }
      }

      // Auto-approve and activate rules saved by any admin
      const resolvedStatus = data.status === 'active' ? 'active' : data.status

      const { data: newRule, error: iError } = await supabase
        .from('product_revenue_rules')
        .insert({
          product_id: data.product_id || null,
          variant_id: data.variant_id || null,
          sharing_method: data.sharing_method,
          status: resolvedStatus,
          version: 1,
          approved_by: admin.id,
          approved_at: new Date().toISOString(),
          start_date: data.start_date || null,
          end_date: data.end_date || null
        })
        .select()
        .single()

      if (iError) throw iError
      ruleId = newRule.id
    }

    // Recreate recipients
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

    // Write audit log with old_value and new_value
    const { data: updatedRule } = await supabase
      .from('product_revenue_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    const newValue = { ...updatedRule, recipients: recipientsToInsert }

    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: data.id ? 'update_revenue_rule' : 'create_revenue_rule',
      target_table: 'product_revenue_rules',
      target_id: ruleId,
      metadata: {
        admin_name: adminProfile?.full_name || admin.email,
        version: version,
        old_value: oldValue,
        new_value: newValue
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true, ruleId }
  } catch (error: any) {
    console.error('Lỗi khi lưu cấu hình chia tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function submitRuleForApprovalAction(id: string) {
  try {
    const { user: admin, profile: adminProfile } = await verifyUserRole()
    checkRevenueManager(adminProfile.revenue_role)
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('product_revenue_rules')
      .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'submit_revenue_rule_for_approval',
      target_table: 'product_revenue_rules',
      target_id: id,
      metadata: {
        admin_name: adminProfile.full_name || admin.email
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true }
  } catch (error: any) {
    console.error('Lỗi gửi duyệt:', error)
    return { success: false, error: error.message }
  }
}

export async function approveRevenueRuleAction(id: string) {
  try {
    const { user: admin, profile: adminProfile } = await verifyUserRole()
    checkSuperAdmin(adminProfile.revenue_role)
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('product_revenue_rules')
      .update({
        status: 'active',
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'approve_revenue_rule',
      target_table: 'product_revenue_rules',
      target_id: id,
      metadata: {
        admin_name: adminProfile.full_name || admin.email
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true }
  } catch (error: any) {
    console.error('Lỗi phê duyệt luật:', error)
    return { success: false, error: error.message }
  }
}

export async function copyRevenueRuleAction(sourceRuleId: string, data: {
  product_id?: string | null
  variant_id?: string | null
}) {
  try {
    const { user: admin, profile: adminProfile } = await verifyUserRole()
    checkRevenueManager(adminProfile.revenue_role)
    const supabase = createAdminClient()

    if (!data.product_id && !data.variant_id) {
      return { success: false, error: 'Vui lòng chọn đích sao chép' }
    }

    // Load source
    const { data: sourceRule } = await supabase
      .from('product_revenue_rules')
      .select('*')
      .eq('id', sourceRuleId)
      .single()

    if (!sourceRule) throw new Error('Không tìm thấy luật nguồn')

    const { data: sourceRecipients } = await supabase
      .from('product_revenue_recipients')
      .select('*')
      .eq('rule_id', sourceRuleId)

    // Verify existing targets
    if (data.variant_id) {
      const { data: existing } = await supabase
        .from('product_revenue_rules')
        .select('id')
        .eq('variant_id', data.variant_id)
        .is('deleted_at', null)
        .maybeSingle()
      if (existing) return { success: false, error: 'Đã có cấu hình hoạt động cho phân loại này' }
    } else if (data.product_id) {
      const { data: existing } = await supabase
        .from('product_revenue_rules')
        .select('id')
        .eq('product_id', data.product_id)
        .is('deleted_at', null)
        .maybeSingle()
      if (existing) return { success: false, error: 'Đã có cấu hình hoạt động cho sản phẩm này' }
    }

    // Copy to new rule
    const isSuper = adminProfile.revenue_role === 'super_admin'
    const status = isSuper ? 'active' : 'draft'

    const { data: newRule, error: insError } = await supabase
      .from('product_revenue_rules')
      .insert({
        product_id: data.product_id || null,
        variant_id: data.variant_id || null,
        sharing_method: sourceRule.sharing_method,
        status: status,
        version: 1,
        approved_by: isSuper ? admin.id : null,
        approved_at: isSuper ? new Date().toISOString() : null,
        start_date: sourceRule.start_date,
        end_date: sourceRule.end_date
      })
      .select()
      .single()

    if (insError) throw insError

    const newRecipients = (sourceRecipients || []).map(r => ({
      rule_id: newRule.id,
      user_id: r.user_id,
      percentage: r.percentage,
      fixed_amount: r.fixed_amount
    }))

    const { error: insRecError } = await supabase
      .from('product_revenue_recipients')
      .insert(newRecipients)

    if (insRecError) throw insRecError

    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'copy_revenue_rule',
      target_table: 'product_revenue_rules',
      target_id: newRule.id,
      metadata: {
        admin_name: adminProfile.full_name || admin.email,
        source_rule_id: sourceRuleId,
        new_value: { ...newRule, recipients: newRecipients }
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true, ruleId: newRule.id }
  } catch (error: any) {
    console.error('Lỗi khi sao chép:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

// Archive instead of permanently deleting rules
export async function deleteRevenueRuleAction(id: string) {
  try {
    const { user: admin, profile: adminProfile } = await verifyUserRole()
    checkRevenueManager(adminProfile.revenue_role)
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('product_revenue_rules')
      .update({
        status: 'archived',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'archive_revenue_rule',
      target_table: 'product_revenue_rules',
      target_id: id,
      metadata: {
        admin_name: adminProfile.full_name || admin.email
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true }
  } catch (error: any) {
    console.error('Lỗi khi lưu trữ cấu hình:', error)
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
    await verifyUserRole()
    const supabase = createAdminClient()

    let query = supabase
      .from('product_revenue_shares')
      .select(`
        *,
        wallet_transactions (id, note)
      `)
      .order('created_at', { ascending: false })

    if (filters?.productId) {
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
    console.error('Lỗi lấy lịch sử chia tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function getRevenueShareStatsAction() {
  try {
    await verifyUserRole()
    const supabase = createAdminClient()

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

    const productStatsMap: Record<string, number> = {}
    const recipientStatsMap: Record<string, { name: string; amount: number }> = {}

    shares?.forEach(s => {
      const amt = Number(s.amount)
      totalAmount += amt

      const createdAtDate = new Date(s.created_at)
      const createdStr = s.created_at.split('T')[0]
      
      if (createdStr === todayStr) {
        todayAmount += amt
      }

      if (createdAtDate.getMonth() === currentMonth && createdAtDate.getFullYear() === currentYear) {
        thisMonthAmount += amt
      }

      productStatsMap[s.product_name_snapshot] = (productStatsMap[s.product_name_snapshot] || 0) + amt

      if (!recipientStatsMap[s.recipient_id]) {
        recipientStatsMap[s.recipient_id] = {
          name: s.recipient_name_snapshot,
          amount: 0
        }
      }
      recipientStatsMap[s.recipient_id].amount += amt
    })

    const topProducts = Object.entries(productStatsMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

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
    console.error('Lỗi lấy thống kê:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

// Manual Compensating Rollback Action
export async function rollbackRevenueShareAction(shareId: string) {
  try {
    const { profile: adminProfile } = await verifyUserRole()
    checkSuperAdmin(adminProfile.revenue_role)
    const supabase = await createClient()

    const { data: res, error } = await supabase.rpc('manual_rollback_revenue_share', { p_share_id: shareId })
    if (error) throw error
    if (res && res.success === false) throw new Error(res.error || 'Lỗi đảo ngược giao dịch')

    revalidatePath('/admin/revenue-share')
    return { success: true }
  } catch (error: any) {
    console.error('Lỗi khi hoàn tiền chia sẻ doanh thu:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

// User role management permissions
export async function updateUserRevenueRoleAction(targetUserId: string, newRole: 'super_admin' | 'revenue_manager' | 'revenue_viewer' | 'none') {
  try {
    const { user: admin, profile: adminProfile } = await verifyUserRole()
    checkSuperAdmin(adminProfile.revenue_role)
    const supabase = createAdminClient()

    if (admin.id === targetUserId) {
      return { success: false, error: 'Không thể tự thay đổi quyền hạn của chính mình' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ revenue_role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)

    if (error) throw error

    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'update_user_revenue_role',
      target_table: 'profiles',
      target_id: targetUserId,
      metadata: {
        admin_name: adminProfile.full_name || admin.email,
        assigned_role: newRole
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Lỗi phân quyền:', error)
    return { success: false, error: error.message }
  }
}

// Version History snapshot getter
export async function getRuleVersionsAction(ruleId: string) {
  try {
    await verifyUserRole()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .eq('target_id', ruleId)
      .in('action', ['create_revenue_rule', 'update_revenue_rule', 'copy_revenue_rule'])
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Lỗi lấy lịch sử phiên bản luật:', error)
    return { success: false, error: error.message }
  }
}

// Get completed orders with items having active rules but missing share calculations (Retry queue)
export async function getFailedSharingOrdersAction() {
  try {
    await verifyUserRole()
    const supabase = createAdminClient()

    // 1. Fetch completed orders in last 30 days
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - 30)

    const { data: orders, error: oError } = await supabase
      .from('orders')
      .select('id, order_code, total_amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', dateLimit.toISOString())

    if (oError) throw oError

    // 2. Fetch all active sharing rules
    const { data: activeRules } = await supabase
      .from('product_revenue_rules')
      .select('id, product_id, variant_id')
      .eq('status', 'active')
      .is('deleted_at', null)

    const activeRulesProductIds = new Set(activeRules?.map(r => r.product_id).filter(Boolean))
    const activeRulesVariantIds = new Set(activeRules?.map(r => r.variant_id).filter(Boolean))

    const failedOrders: any[] = []

    for (const order of orders || []) {
      // Fetch order items
      const { data: items } = await supabase
        .from('order_items')
        .select('id, product_id, variant_id, product_name')
        .eq('order_id', order.id)

      let hasUnsharedEligibleItem = false
      const unsharedItemsList: string[] = []

      for (const item of items || []) {
        // Check if eligible for any active rules
        const isEligible = activeRulesVariantIds.has(item.variant_id) || activeRulesProductIds.has(item.product_id)
        if (isEligible) {
          // Check if shares exist
          const { count } = await supabase
            .from('product_revenue_shares')
            .select('*', { count: 'exact', head: true })
            .eq('order_item_id', item.id)
            .eq('status', 'completed')

          if (count === 0) {
            hasUnsharedEligibleItem = true
            unsharedItemsList.push(item.product_name)
          }
        }
      }

      if (hasUnsharedEligibleItem) {
        failedOrders.push({
          ...order,
          unshared_items: unsharedItemsList
        })
      }
    }

    return { success: true, data: failedOrders }
  } catch (error: any) {
    console.error('Lỗi khi tìm đơn hàng lỗi chia tiền:', error)
    return { success: false, error: error.message }
  }
}

// Manual retry sharing execution
export async function retryOrderRevenueSharingAction(orderId: string) {
  try {
    const { user: admin, profile: adminProfile } = await verifyUserRole()
    checkRevenueManager(adminProfile.revenue_role)
    const supabase = createAdminClient()

    const { data: res, error } = await supabase.rpc('process_order_revenue_sharing', { p_order_id: orderId })
    if (error) throw error
    if (res && res.success === false) throw new Error(res.error || 'Lỗi xử lý chia tiền')

    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'retry_revenue_sharing',
      target_table: 'orders',
      target_id: orderId,
      metadata: {
        admin_name: adminProfile.full_name || admin.email,
        result: res
      }
    })

    revalidatePath('/admin/revenue-share')
    return { success: true, details: res }
  } catch (error: any) {
    console.error('Lỗi khi chạy lại chia tiền:', error)
    return { success: false, error: error.message }
  }
}

export async function executeDirectCostSplitAction(data: {
  products: {
    product_id?: string | null
    variant_id?: string | null
    amount: number
    quantity: number
    discount: number
  }[]
  sharing_method: 'equal' | 'percentage' | 'fixed'
  recipients: {
    user_id: string
    percentage?: number | null
    fixed_amount?: number | null
  }[]
}) {
  try {
    const { user: admin, profile: adminProfile } = await verifyUserRole()
    checkRevenueManager(adminProfile.revenue_role)
    const supabase = createAdminClient()

    // 1. Calculate total net amount
    let totalNetAmount = 0
    const productNamesList: string[] = []

    for (const p of data.products) {
      const net = Math.max(0, (p.amount * p.quantity) - p.discount)
      totalNetAmount += net

      // Lookup product/variant name for snapshotting
      let productName = 'Sản phẩm trực tiếp'
      if (p.variant_id) {
        const { data: v } = await supabase.from('product_variants').select('name').eq('id', p.variant_id).single()
        if (v) productName = v.name
      } else if (p.product_id) {
        const { data: prod } = await supabase.from('products').select('name').eq('id', p.product_id).single()
        if (prod) productName = prod.name
      }
      productNamesList.push(`${productName} (SL: ${p.quantity})`)
    }

    const combinedProductNames = productNamesList.join(', ')
    const recipientCount = data.recipients.length
    if (recipientCount === 0) throw new Error('Vui lòng chọn ít nhất một người nhận')

    // 2. Process each recipient
    for (const r of data.recipients) {
      let shareAmount = 0
      if (data.sharing_method === 'equal') {
        shareAmount = totalNetAmount / recipientCount
      } else if (data.sharing_method === 'percentage') {
        shareAmount = totalNetAmount * ((r.percentage || 0) / 100)
      } else if (data.sharing_method === 'fixed') {
        // Fixed amount is entered as a direct value for the total split
        shareAmount = r.fixed_amount || 0
      }

      shareAmount = Math.round(shareAmount)
      if (shareAmount <= 0) continue

      // Lock recipient wallet balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, full_name, email')
        .eq('id', r.user_id)
        .single()

      const currentBalance = profile ? (profile.balance || 0) : 0
      const recipientName = profile ? (profile.full_name || profile.email) : 'Thành viên'

      // Deduct wallet balance
      const { error: wError } = await supabase
        .from('profiles')
        .update({ balance: currentBalance - shareAmount })
        .eq('id', r.user_id)

      if (wError) throw wError

      // Insert wallet transaction
      const { data: tx, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: r.user_id,
          type: 'revenue_share',
          amount: -shareAmount,
          balance_before: currentBalance,
          balance_after: currentBalance - shareAmount,
          note: `Trừ tiền chia sẻ chi phí: ${combinedProductNames} (Tổng trừ: -${shareAmount.toLocaleString()}đ)`
        })
        .select()
        .single()

      if (txError) throw txError

      // Insert product_revenue_shares record
      const { error: shareError } = await supabase
        .from('product_revenue_shares')
        .insert({
          recipient_id: r.user_id,
          amount: -shareAmount,
          percentage: data.sharing_method === 'percentage' ? r.percentage : (data.sharing_method === 'equal' ? Math.round(100.0 / recipientCount) : null),
          status: 'completed',
          wallet_transaction_id: tx.id,
          order_code_snapshot: 'MANUAL',
          product_name_snapshot: combinedProductNames,
          admin_name_snapshot: adminProfile.full_name || admin.email,
          recipient_name_snapshot: recipientName
        })

      if (shareError) throw shareError

      // Send notification
      await supabase.from('notifications').insert({
        user_id: r.user_id,
        title: 'Chia sẻ chi phí sản phẩm',
        message: `Tài khoản bị khấu trừ chi phí ${combinedProductNames}: -${shareAmount.toLocaleString()}đ`,
        type: 'revenue_share',
        link: '/tai-khoan/chia-tien'
      })
    }

    // Insert public activity log
    await supabase.from('revenue_share_activities').insert({
      admin_name: adminProfile.full_name || admin.email,
      product_name: combinedProductNames,
      recipients_count: recipientCount,
      total_amount: totalNetAmount,
      description: `Admin ${adminProfile.full_name || admin.email} đã phân chia trực tiếp chi phí ${combinedProductNames} cho ${recipientCount} người. Tổng khấu trừ: -${totalNetAmount.toLocaleString()}đ.`
    })

    revalidatePath('/admin/revenue-share')
    return { success: true }
  } catch (error: any) {
    console.error('Lỗi khi chia tiền trực tiếp:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

