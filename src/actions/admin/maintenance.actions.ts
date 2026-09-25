'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    throw new Error('Bạn không có quyền quản trị viên')
  }

  return user
}

export async function getDatabaseMaintenanceStats() {
  try {
    await checkAdminAuth()
    const adminClient = createAdminClient()

    const { data, error } = await adminClient.rpc('get_database_maintenance_stats')

    if (error) {
      console.warn('[Maintenance Actions] get_database_maintenance_stats fallback:', error)
      // Fallback if RPC is not available yet
      const { data: fallbackStats, error: fallbackError } = await adminClient.rpc('get_database_table_stats')
      if (fallbackError || !fallbackStats) {
        return {
          success: true,
          data: {
            summary: {
              tracked_tables_count: 0,
              total_live_tuples: 0,
              total_dead_tuples: 0,
              avg_dead_tuple_percent: 0,
              total_size_bytes: 0,
              total_size_pretty: 'N/A',
              generated_at: new Date().toISOString()
            },
            tables: []
          }
        }
      }
      return { success: true, data: fallbackStats }
    }

    return { success: true, data }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message || 'Lỗi khi lấy thông tin thống kê database' }
  }
}

export async function previewDatabaseCleanup(retentionDays: number = 180, batchSize: number = 5000) {
  try {
    await checkAdminAuth()
    const adminClient = createAdminClient()

    const safeRetention = Math.max(30, Math.min(retentionDays, 730))
    const safeBatch = Math.max(100, Math.min(batchSize, 10000))

    const { data, error } = await adminClient.rpc('clean_database_maintenance', {
      p_dry_run: true,
      p_log_retention_days: safeRetention,
      p_batch_size: safeBatch,
      p_trigger_type: 'manual'
    })

    if (error) {
      throw new Error(error.message || 'Lỗi khi quét xem trước dọn dẹp')
    }

    return { success: true, data }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message || 'Có lỗi xảy ra khi xem trước dọn dẹp' }
  }
}

export async function executeDatabaseCleanup(retentionDays: number = 180, batchSize: number = 5000) {
  try {
    await checkAdminAuth()
    const adminClient = createAdminClient()

    const safeRetention = Math.max(30, Math.min(retentionDays, 730))
    const safeBatch = Math.max(100, Math.min(batchSize, 10000))

    const { data, error } = await adminClient.rpc('clean_database_maintenance', {
      p_dry_run: false,
      p_log_retention_days: safeRetention,
      p_batch_size: safeBatch,
      p_trigger_type: 'manual'
    })

    if (error) {
      throw new Error(error.message || 'Lỗi khi thực thi dọn dẹp database')
    }

    revalidatePath('/admin/settings/database')
    return { success: true, data }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message || 'Có lỗi xảy ra khi thực thi dọn dẹp' }
  }
}

export async function getDatabaseMaintenanceHistory(limit: number = 15) {
  try {
    await checkAdminAuth()
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('database_maintenance_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      // Table might not exist yet if migration hasn't run
      return { success: true, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message || 'Lỗi khi lấy lịch sử bảo trì' }
  }
}
