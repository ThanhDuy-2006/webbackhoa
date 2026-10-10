export type HouseworkTaskStatus = 'pending' | 'completed'

export interface HouseworkAssignee {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

export interface HouseworkTask {
  id: string
  title: string
  assigned_to: string
  assigned_by: string | null
  task_date: string // YYYY-MM-DD
  week_start: string // YYYY-MM-DD (Monday)
  status: HouseworkTaskStatus
  note: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  assignee?: HouseworkAssignee | null
  assigner?: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

export interface HouseworkSettings {
  id: string
  auto_rotate: boolean
  updated_at: string
}

export interface MemberHouseworkStat {
  user_id: string
  full_name: string
  avatar_url: string | null
  email: string | null
  total: number
  completed: number
  pending: number
  rate: number // 0 - 100 percentage
}

export interface HouseworkWeekSummary {
  week_start: string
  week_end: string
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  completion_rate: number // 0 - 100 percentage
  member_stats: MemberHouseworkStat[]
}

export interface CreateHouseworkTaskInput {
  title: string
  assigned_to: string
  task_date: string // YYYY-MM-DD
  week_start?: string // If not provided, computed from task_date
  note?: string | null
}

export interface UpdateHouseworkTaskInput {
  title?: string
  assigned_to?: string
  task_date?: string
  note?: string | null
}

export interface HouseworkRotationConfig {
  id: string
  start_date: string // YYYY-MM-DD
  updated_at: string
}

export interface HouseworkRotationMember {
  id: string
  user_id: string
  order_index: number
  created_at: string
  profile?: HouseworkAssignee | null
}

export interface WeekDutySchedule {
  week_start: string // YYYY-MM-DD (Monday)
  week_end: string // YYYY-MM-DD (Sunday)
  week_range: string // e.g. "12/10 – 18/10/2026"
  saturday_date: string // YYYY-MM-DD
  saturday_display: string // "17/10/2026"
  sunday_date: string // YYYY-MM-DD
  sunday_display: string // "18/10/2026"
  assignee: HouseworkAssignee | null
  is_current_week: boolean
  is_next_week: boolean
  is_user_duty: boolean
}

export interface PopupCheckResult {
  should_show: boolean
  week_start?: string
  member_name?: string
  saturday_display?: string
  sunday_display?: string
}

