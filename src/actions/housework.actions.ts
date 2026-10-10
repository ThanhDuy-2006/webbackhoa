'use server'

import { revalidatePath } from 'next/cache'
import { HouseworkRepository } from '@/repositories/housework.repository'
import { assertAdmin, assertAuthenticatedUser } from '@/lib/supabase/auth-guard'
import { CreateHouseworkTaskInput, UpdateHouseworkTaskInput } from '@/types/housework.type'
import { shiftWeekMonday, getMondayOfWeek } from '@/lib/housework-date'

/**
 * Gets tasks and summary for a specific week
 */
export async function getWeekTasksAction(weekStart: string) {
  try {
    await assertAuthenticatedUser()

    const [tasks, summary, settings] = await Promise.all([
      HouseworkRepository.getTasksByWeek(weekStart),
      HouseworkRepository.getWeekSummary(weekStart),
      HouseworkRepository.getSettings()
    ])

    return {
      success: true,
      data: {
        tasks,
        summary,
        settings
      }
    }
  } catch (error: any) {
    console.error('Lỗi lấy dữ liệu công việc tuần:', error)
    return { success: false, error: error.message || 'Lỗi khi tải dữ liệu công việc' }
  }
}

/**
 * Toggles a task's status (completed / pending)
 * Allowed for task assignee or Admin
 */
export async function toggleTaskStatusAction(taskId: string) {
  try {
    const { user, supabase } = await assertAuthenticatedUser()

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    const result = await HouseworkRepository.toggleTaskStatus(taskId, user.id, isAdmin)

    if (result.success) {
      revalidatePath('/don-nha')
      revalidatePath('/admin/housework')
    }

    return result
  } catch (error: any) {
    console.error('Lỗi chuyển trạng thái công việc:', error)
    return { success: false, data: undefined, error: error.message || 'Lỗi khi cập nhật trạng thái' }
  }
}

/**
 * Creates a new task (Admin only)
 */
export async function createHouseworkTaskAction(input: CreateHouseworkTaskInput) {
  try {
    const { user } = await assertAdmin()

    if (!input.title || !input.title.trim()) {
      return { success: false, data: undefined, error: 'Vui lòng nhập tên công việc' }
    }
    if (!input.assigned_to) {
      return { success: false, data: undefined, error: 'Vui lòng chọn người thực hiện' }
    }
    if (!input.task_date) {
      return { success: false, data: undefined, error: 'Vui lòng chọn ngày thực hiện' }
    }

    const result = await HouseworkRepository.createTask(input, user.id)

    if (result.success) {
      revalidatePath('/don-nha')
      revalidatePath('/admin/housework')
    }

    return result
  } catch (error: any) {
    console.error('Lỗi tạo công việc:', error)
    return { success: false, data: undefined, error: error.message || 'Lỗi khi tạo công việc' }
  }
}

/**
 * Updates an existing task (Admin only)
 */
export async function updateHouseworkTaskAction(taskId: string, input: UpdateHouseworkTaskInput) {
  try {
    await assertAdmin()

    if (input.title !== undefined && !input.title.trim()) {
      return { success: false, data: undefined, error: 'Tên công việc không được để trống' }
    }

    const result = await HouseworkRepository.updateTask(taskId, input)

    if (result.success) {
      revalidatePath('/don-nha')
      revalidatePath('/admin/housework')
    }

    return result
  } catch (error: any) {
    console.error('Lỗi cập nhật công việc:', error)
    return { success: false, data: undefined, error: error.message || 'Lỗi khi cập nhật công việc' }
  }
}

/**
 * Deletes a task (Admin only)
 */
export async function deleteHouseworkTaskAction(taskId: string) {
  try {
    await assertAdmin()

    const result = await HouseworkRepository.deleteTask(taskId)

    if (result.success) {
      revalidatePath('/don-nha')
      revalidatePath('/admin/housework')
    }

    return result
  } catch (error: any) {
    console.error('Lỗi xóa công việc:', error)
    return { success: false, error: error.message || 'Lỗi khi xóa công việc' }
  }
}

/**
 * Copies tasks from previous week into target week (Admin only)
 */
export async function copyTasksFromPreviousWeekAction(targetWeekStart: string) {
  try {
    const { user } = await assertAdmin()

    const previousWeekStart = shiftWeekMonday(targetWeekStart, -1)
    const result = await HouseworkRepository.copyTasksFromWeek(previousWeekStart, targetWeekStart, user.id)

    if (result.success) {
      revalidatePath('/don-nha')
      revalidatePath('/admin/housework')
    }

    return result
  } catch (error: any) {
    console.error('Lỗi sao chép công việc tuần trước:', error)
    return { success: false, copiedCount: 0, error: error.message || 'Lỗi khi sao chép công việc' }
  }
}

/**
 * Rotates tasks for target week based on previous or source week (Admin only)
 */
export async function rotateTasksForWeekAction(targetWeekStart: string, customSourceWeekStart?: string) {
  try {
    const { user } = await assertAdmin()

    const sourceWeekStart = customSourceWeekStart || shiftWeekMonday(targetWeekStart, -1)
    const result = await HouseworkRepository.rotateTasks(sourceWeekStart, targetWeekStart, user.id)

    if (result.success) {
      revalidatePath('/don-nha')
      revalidatePath('/admin/housework')
    }

    return result
  } catch (error: any) {
    console.error('Lỗi xoay vòng công việc:', error)
    return { success: false, rotatedCount: 0, error: error.message || 'Lỗi khi xoay vòng công việc' }
  }
}

/**
 * Updates housework settings (Admin only)
 */
export async function updateHouseworkSettingsAction(autoRotate: boolean) {
  try {
    await assertAdmin()

    const result = await HouseworkRepository.updateSettings(autoRotate)

    if (result.success) {
      revalidatePath('/don-nha')
      revalidatePath('/admin/housework')
    }

    return result
  } catch (error: any) {
    console.error('Lỗi cập nhật cấu hình xoay vòng:', error)
    return { success: false, error: error.message || 'Lỗi cập nhật cấu hình' }
  }
}

/**
 * Gets history of past weeks and completion statistics
 */
export async function getHouseworkHistoryAction() {
  try {
    await assertAuthenticatedUser()

    const history = await HouseworkRepository.getHistoryWeeks(12)
    return { success: true, data: history }
  } catch (error: any) {
    console.error('Lỗi lấy lịch sử dọn nhà:', error)
    return { success: false, error: error.message || 'Lỗi khi tải lịch sử' }
  }
}
