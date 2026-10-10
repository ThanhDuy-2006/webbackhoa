import { createClient } from '@/lib/supabase/server'
import { 
  HouseworkTask, 
  HouseworkSettings, 
  HouseworkWeekSummary, 
  MemberHouseworkStat,
  CreateHouseworkTaskInput, 
  UpdateHouseworkTaskInput,
  HouseworkRotationConfig,
  HouseworkRotationMember,
  WeekDutySchedule,
  PopupCheckResult
} from '@/types/housework.type'
import { 
  getMondayOfWeek, 
  getSundayOfWeek, 
  parseDateSafe, 
  formatDateSafe, 
  shiftWeekMonday,
  getSaturdayOfWeek,
  formatDayMonthYear,
  getRotationAssigneeForWeek
} from '@/lib/housework-date'
import { addDays, differenceInCalendarDays } from 'date-fns'

export const HouseworkRepository = {
  /**
   * Fetches all tasks for a specific week (Monday)
   */
  async getTasksByWeek(weekStart: string): Promise<HouseworkTask[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('housework_tasks')
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, avatar_url, email),
        assigner:profiles!assigned_by(id, full_name, email)
      `)
      .eq('week_start', weekStart)
      .order('task_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Lỗi lấy danh sách công việc dọn nhà theo tuần:', error)
      return []
    }

    return (data as any) || []
  },

  /**
   * Computes week statistics and member breakdown for a specific week
   */
  async getWeekSummary(weekStart: string): Promise<HouseworkWeekSummary> {
    const tasks = await this.getTasksByWeek(weekStart)
    const weekEnd = getSundayOfWeek(weekStart)

    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const pendingTasks = totalTasks - completedTasks
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Group stats by assignee
    const memberMap = new Map<string, {
      user_id: string
      full_name: string
      avatar_url: string | null
      email: string | null
      total: number
      completed: number
      pending: number
    }>()

    for (const task of tasks) {
      const userId = task.assigned_to
      const name = task.assignee?.full_name || task.assignee?.email?.split('@')[0] || 'Thành viên'
      const avatar = task.assignee?.avatar_url || null
      const email = task.assignee?.email || null

      if (!memberMap.has(userId)) {
        memberMap.set(userId, {
          user_id: userId,
          full_name: name,
          avatar_url: avatar,
          email,
          total: 0,
          completed: 0,
          pending: 0,
        })
      }

      const m = memberMap.get(userId)!
      m.total += 1
      if (task.status === 'completed') {
        m.completed += 1
      } else {
        m.pending += 1
      }
    }

    const memberStats: MemberHouseworkStat[] = Array.from(memberMap.values()).map(m => ({
      ...m,
      rate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0
    }))

    return {
      week_start: weekStart,
      week_end: weekEnd,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      completion_rate: completionRate,
      member_stats: memberStats
    }
  },

  /**
   * Gets distinct past week starts with summary statistics for history view
   */
  async getHistoryWeeks(limit: number = 10): Promise<HouseworkWeekSummary[]> {
    const supabase = await createClient()

    // Get distinct week_start
    const { data, error } = await supabase
      .from('housework_tasks')
      .select('week_start')
      .order('week_start', { ascending: false })

    if (error || !data) {
      console.error('Lỗi lấy lịch sử các tuần:', error)
      return []
    }

    const uniqueWeeks = Array.from(new Set(data.map(d => d.week_start))).slice(0, limit)
    const summaries: HouseworkWeekSummary[] = []

    for (const w of uniqueWeeks) {
      const summary = await this.getWeekSummary(w)
      summaries.push(summary)
    }

    return summaries
  },

  /**
   * Creates a new housework task (Admin)
   */
  async createTask(input: CreateHouseworkTaskInput, assignedBy: string): Promise<{ success: boolean; data?: HouseworkTask; error?: string }> {
    const supabase = await createClient()

    const weekStart = input.week_start || getMondayOfWeek(input.task_date)

    const { data, error } = await supabase
      .from('housework_tasks')
      .insert({
        title: input.title.trim(),
        assigned_to: input.assigned_to,
        assigned_by: assignedBy,
        task_date: input.task_date,
        week_start: weekStart,
        status: 'pending',
        note: input.note ? input.note.trim() : null,
      })
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, avatar_url, email),
        assigner:profiles!assigned_by(id, full_name, email)
      `)
      .single()

    if (error) {
      console.error('Lỗi tạo công việc dọn nhà:', error)
      return { success: false, error: error.message || 'Lỗi khi tạo công việc' }
    }

    return { success: true, data: (data as any) }
  },

  /**
   * Updates an existing housework task (Admin)
   */
  async updateTask(id: string, input: UpdateHouseworkTaskInput): Promise<{ success: boolean; data?: HouseworkTask; error?: string }> {
    const supabase = await createClient()

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.assigned_to !== undefined) updatePayload.assigned_to = input.assigned_to
    if (input.note !== undefined) updatePayload.note = input.note ? input.note.trim() : null

    if (input.task_date !== undefined) {
      updatePayload.task_date = input.task_date
      updatePayload.week_start = getMondayOfWeek(input.task_date)
    }

    const { data, error } = await supabase
      .from('housework_tasks')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, avatar_url, email),
        assigner:profiles!assigned_by(id, full_name, email)
      `)
      .single()

    if (error) {
      console.error('Lỗi cập nhật công việc:', error)
      return { success: false, error: error.message || 'Lỗi khi cập nhật công việc' }
    }

    return { success: true, data: (data as any) }
  },

  /**
   * Deletes a housework task (Admin)
   */
  async deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('housework_tasks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Lỗi xóa công việc:', error)
      return { success: false, error: error.message || 'Lỗi khi xóa công việc' }
    }

    return { success: true }
  },

  /**
   * Toggles completion status of a task
   * Checked against permissions: Only assignee or Admin can toggle
   */
  async toggleTaskStatus(taskId: string, userId: string, isAdmin: boolean): Promise<{ success: boolean; data?: HouseworkTask; error?: string }> {
    const supabase = await createClient()

    // 1. Fetch current task to verify permission
    const { data: task, error: fetchError } = await supabase
      .from('housework_tasks')
      .select('id, assigned_to, status')
      .eq('id', taskId)
      .single()

    if (fetchError || !task) {
      return { success: false, error: 'Không tìm thấy công việc này' }
    }

    if (!isAdmin && task.assigned_to !== userId) {
      return { success: false, error: 'Bạn chỉ có quyền hoàn thành công việc được phân công cho mình' }
    }

    const isCurrentlyPending = task.status === 'pending'
    const newStatus = isCurrentlyPending ? 'completed' : 'pending'
    const completedAt = isCurrentlyPending ? new Date().toISOString() : null

    const { data: updated, error: updateError } = await supabase
      .from('housework_tasks')
      .update({
        status: newStatus,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, avatar_url, email),
        assigner:profiles!assigned_by(id, full_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Lỗi chuyển trạng thái công việc:', updateError)
      return { success: false, error: updateError.message || 'Lỗi cập nhật trạng thái' }
    }

    return { success: true, data: (updated as any) }
  },

  /**
   * Copies tasks from a source week (usually previous week) to target week
   * Preserves day-of-week relative offset, avoids duplicates
   */
  async copyTasksFromWeek(fromWeekStart: string, toWeekStart: string, assignedBy: string): Promise<{ success: boolean; copiedCount: number; error?: string }> {
    const supabase = await createClient()

    // 1. Fetch source tasks
    const sourceTasks = await this.getTasksByWeek(fromWeekStart)
    if (sourceTasks.length === 0) {
      return { success: false, copiedCount: 0, error: 'Tuần trước không có công việc nào để sao chép' }
    }

    // 2. Fetch target week tasks to prevent duplicates
    const targetTasks = await this.getTasksByWeek(toWeekStart)
    const existingKeySet = new Set(
      targetTasks.map(t => `${t.title.toLowerCase().trim()}_${t.assigned_to}_${t.task_date}`)
    )

    const fromMonday = parseDateSafe(fromWeekStart)
    const toMonday = parseDateSafe(toWeekStart)

    const tasksToInsert: Array<{
      title: string
      assigned_to: string
      assigned_by: string
      task_date: string
      week_start: string
      status: 'pending'
      note: string | null
    }> = []

    for (const src of sourceTasks) {
      const srcDate = parseDateSafe(src.task_date)
      const dayOffset = differenceInCalendarDays(srcDate, fromMonday)
      const targetDate = formatDateSafe(addDays(toMonday, Math.max(0, Math.min(6, dayOffset))))

      const uniqueKey = `${src.title.toLowerCase().trim()}_${src.assigned_to}_${targetDate}`
      if (!existingKeySet.has(uniqueKey)) {
        existingKeySet.add(uniqueKey)
        tasksToInsert.push({
          title: src.title,
          assigned_to: src.assigned_to,
          assigned_by: assignedBy,
          task_date: targetDate,
          week_start: toWeekStart,
          status: 'pending',
          note: src.note,
        })
      }
    }

    if (tasksToInsert.length === 0) {
      return { success: true, copiedCount: 0, error: 'Tất cả công việc đã tồn tại trong tuần này' }
    }

    const { error: insertError } = await supabase
      .from('housework_tasks')
      .insert(tasksToInsert)

    if (insertError) {
      console.error('Lỗi sao chép công việc:', insertError)
      return { success: false, copiedCount: 0, error: insertError.message || 'Lỗi khi sao chép công việc' }
    }

    return { success: true, copiedCount: tasksToInsert.length }
  },

  /**
   * Rotates assignments for a target week based on source week tasks
   * Shifts assigned members in round-robin order
   */
  async rotateTasks(sourceWeekStart: string, targetWeekStart: string, assignedBy: string): Promise<{ success: boolean; rotatedCount: number; error?: string }> {
    const supabase = await createClient()

    // 1. Fetch source tasks
    const sourceTasks = await this.getTasksByWeek(sourceWeekStart)
    if (sourceTasks.length === 0) {
      return { success: false, rotatedCount: 0, error: 'Tuần nguồn không có công việc nào để xoay vòng' }
    }

    // 2. Fetch distinct active users involved
    const userIds = Array.from(new Set(sourceTasks.map(t => t.assigned_to)))
    if (userIds.length <= 1) {
      return { success: false, rotatedCount: 0, error: 'Cần ít nhất 2 thành viên khác nhau để thực hiện xoay vòng công việc' }
    }

    // 3. Fetch existing target week tasks to prevent duplicates
    const targetTasks = await this.getTasksByWeek(targetWeekStart)
    const existingKeySet = new Set(
      targetTasks.map(t => `${t.title.toLowerCase().trim()}_${t.task_date}`)
    )

    const fromMonday = parseDateSafe(sourceWeekStart)
    const toMonday = parseDateSafe(targetWeekStart)

    const tasksToInsert: Array<{
      title: string
      assigned_to: string
      assigned_by: string
      task_date: string
      week_start: string
      status: 'pending'
      note: string | null
    }> = []

    for (const src of sourceTasks) {
      const srcDate = parseDateSafe(src.task_date)
      const dayOffset = differenceInCalendarDays(srcDate, fromMonday)
      const targetDate = formatDateSafe(addDays(toMonday, Math.max(0, Math.min(6, dayOffset))))

      const uniqueKey = `${src.title.toLowerCase().trim()}_${targetDate}`
      if (existingKeySet.has(uniqueKey)) {
        continue // Skip if this task on this day already exists in target week
      }

      // Rotate assignee: index -> (index + 1) % userIds.length
      const currentIndex = userIds.indexOf(src.assigned_to)
      const nextIndex = (currentIndex + 1) % userIds.length
      const rotatedAssigneeId = userIds[nextIndex]

      existingKeySet.add(uniqueKey)
      tasksToInsert.push({
        title: src.title,
        assigned_to: rotatedAssigneeId,
        assigned_by: assignedBy,
        task_date: targetDate,
        week_start: targetWeekStart,
        status: 'pending',
        note: src.note,
      })
    }

    if (tasksToInsert.length === 0) {
      return { success: true, rotatedCount: 0, error: 'Các công việc trong tuần đã được phân công đầy đủ' }
    }

    const { error: insertError } = await supabase
      .from('housework_tasks')
      .insert(tasksToInsert)

    if (insertError) {
      console.error('Lỗi xoay vòng công việc:', insertError)
      return { success: false, rotatedCount: 0, error: insertError.message || 'Lỗi khi xoay vòng công việc' }
    }

    return { success: true, rotatedCount: tasksToInsert.length }
  },

  /**
   * Gets housework settings (auto_rotate flag)
   */
  async getSettings(): Promise<HouseworkSettings> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('housework_settings')
      .select('*')
      .eq('id', 'default')
      .single()

    if (error || !data) {
      return { id: 'default', auto_rotate: false, updated_at: new Date().toISOString() }
    }

    return data
  },

  /**
   * Updates housework settings (Admin)
   */
  async updateSettings(autoRotate: boolean): Promise<{ success: boolean; data?: HouseworkSettings; error?: string }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('housework_settings')
      .upsert({
        id: 'default',
        auto_rotate: autoRotate,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Lỗi cập nhật cài đặt dọn nhà:', error)
      return { success: false, error: error.message || 'Lỗi cập nhật cài đặt' }
    }

    return { success: true, data }
  },

  /**
   * Fetches rotation configuration and ordered members
   */
  async getRotationConfigAndMembers(): Promise<{ config: HouseworkRotationConfig; members: HouseworkRotationMember[] }> {
    const supabase = await createClient()

    try {
      // 1. Fetch config
      const { data: configData } = await supabase
        .from('housework_rotation_config')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      const config: HouseworkRotationConfig = configData || {
        id: 'default',
        start_date: '2026-10-12',
        updated_at: new Date().toISOString()
      }

      // 2. Fetch members ordered by order_index
      const { data: membersData, error: membersError } = await supabase
        .from('housework_rotation_members')
        .select(`
          id,
          user_id,
          order_index,
          created_at,
          profile:profiles(id, full_name, avatar_url, email)
        `)
        .order('order_index', { ascending: true })

      if (membersError) {
        console.error('Lỗi lấy danh sách thành viên luân phiên:', membersError)
        return { config, members: [] }
      }

      return {
        config,
        members: (membersData as any) || []
      }
    } catch (err) {
      console.error('Lỗi truy vấn bảng luân phiên dọn nhà:', err)
      return {
        config: { id: 'default', start_date: '2026-10-12', updated_at: new Date().toISOString() },
        members: []
      }
    }
  },

  /**
   * Saves rotation configuration and members list in order (Admin only)
   */
  async saveRotationConfig(startDate: string, memberUserIds: string[]): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
      // 1. Upsert config
      const { error: configError } = await supabase
        .from('housework_rotation_config')
        .upsert({
          id: 'default',
          start_date: startDate,
          updated_at: new Date().toISOString()
        })

      if (configError) {
        console.error('Lỗi lưu cấu hình luân phiên:', configError)
        if (configError.message?.includes('schema cache') || configError.message?.includes('does not exist')) {
          return { 
            success: false, 
            error: "Bảng dữ liệu 'housework_rotation_config' chưa được tạo trên Supabase. Vui lòng chạy file migration SQL trong Supabase SQL Editor!" 
          }
        }
        return { success: false, error: configError.message }
      }

      // 2. Clear old members
      const { error: deleteError } = await supabase
        .from('housework_rotation_members')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (deleteError) {
        console.error('Lỗi xóa danh sách thành viên luân phiên cũ:', deleteError)
        if (deleteError.message?.includes('schema cache') || deleteError.message?.includes('does not exist')) {
          return { 
            success: false, 
            error: "Bảng dữ liệu 'housework_rotation_members' chưa được tạo trên Supabase. Vui lòng chạy file migration SQL trong Supabase SQL Editor!" 
          }
        }
        return { success: false, error: deleteError.message }
      }

      // 3. Insert new ordered members
      if (memberUserIds.length > 0) {
        const records = memberUserIds.map((userId, index) => ({
          user_id: userId,
          order_index: index + 1
        }))

        const { error: insertError } = await supabase
          .from('housework_rotation_members')
          .insert(records)

        if (insertError) {
          console.error('Lỗi thêm danh sách thành viên luân phiên mới:', insertError)
          return { success: false, error: insertError.message }
        }
      }

      return { success: true }
    } catch (err: any) {
      console.error('Lỗi ngoại lệ khi lưu cấu hình luân phiên:', err)
      return { success: false, error: err.message || 'Lỗi lưu cấu hình' }
    }
  },

  /**
   * Computes the duty schedule for current and upcoming weeks
   */
  async getRotationSchedule(numberOfWeeks: number = 8, currentUserId?: string): Promise<WeekDutySchedule[]> {
    const { config, members } = await this.getRotationConfigAndMembers()
    const currentWeekMonday = getMondayOfWeek()

    const schedules: WeekDutySchedule[] = []

    for (let i = 0; i < numberOfWeeks; i++) {
      const targetMonday = shiftWeekMonday(currentWeekMonday, i)
      const targetSunday = getSundayOfWeek(targetMonday)
      const saturday = getSaturdayOfWeek(targetMonday)
      
      const { assignee } = getRotationAssigneeForWeek(
        targetMonday,
        config.start_date,
        members
      )

      const assigneeProfile = assignee?.profile || null
      const isCurrent = i === 0
      const isNext = i === 1
      const isUserDuty = Boolean(currentUserId && assigneeProfile && assigneeProfile.id === currentUserId)

      schedules.push({
        week_start: targetMonday,
        week_end: targetSunday,
        week_range: `${formatDayMonthYear(targetMonday)} – ${formatDayMonthYear(targetSunday)}`,
        saturday_date: saturday,
        saturday_display: formatDayMonthYear(saturday),
        sunday_date: targetSunday,
        sunday_display: formatDayMonthYear(targetSunday),
        assignee: assigneeProfile,
        is_current_week: isCurrent,
        is_next_week: isNext,
        is_user_duty: isUserDuty
      })
    }

    return schedules
  },

  /**
   * Checks if the current logged-in user is on duty this week and hasn't acknowledged the popup
   */
  async checkUserPopupDuty(userId: string): Promise<PopupCheckResult> {
    try {
      const supabase = await createClient()
      const currentWeekMonday = getMondayOfWeek()
      const { config, members } = await this.getRotationConfigAndMembers()

      if (!members || members.length === 0) {
        return { should_show: false }
      }

      const { assignee } = getRotationAssigneeForWeek(
        currentWeekMonday,
        config.start_date,
        members
      )

      if (!assignee || assignee.user_id !== userId) {
        return { should_show: false }
      }

      // Check if user has already acknowledged for this week in database
      const { data: ack } = await supabase
        .from('housework_popup_acknowledgments')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', currentWeekMonday)
        .maybeSingle()

      if (ack) {
        return { should_show: false }
      }

      const saturday = getSaturdayOfWeek(currentWeekMonday)
      const sunday = getSundayOfWeek(currentWeekMonday)
      const memberName = assignee.profile?.full_name || assignee.profile?.email?.split('@')[0] || 'Bạn'

      return {
        should_show: true,
        week_start: currentWeekMonday,
        member_name: memberName,
        saturday_display: formatDayMonthYear(saturday),
        sunday_display: formatDayMonthYear(sunday)
      }
    } catch (err) {
      console.error('Lỗi kiểm tra popup dọn nhà:', err)
      return { should_show: false }
    }
  },

  /**
   * Acknowledges the duty popup for the user in the current week
   */
  async acknowledgePopupDuty(userId: string, weekStart: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('housework_popup_acknowledgments')
        .insert({
          user_id: userId,
          week_start: weekStart
        })

      if (error && error.code !== '23505') {
        console.error('Lỗi lưu trạng thái đã xem popup dọn nhà:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err: any) {
      console.error('Lỗi ngoại lệ khi lưu trạng thái popup:', err)
      return { success: true }
    }
  }
}

