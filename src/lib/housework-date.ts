import { startOfWeek, addDays, subWeeks, addWeeks, format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

/**
 * Gets the current date string (YYYY-MM-DD) in Vietnam timezone (Asia/Ho_Chi_Minh)
 */
export function getVietnamTodayString(): string {
  // Use Intl.DateTimeFormat to reliably extract year, month, day in Asia/Ho_Chi_Minh
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(new Date()) // Format 'en-CA' outputs YYYY-MM-DD
}

/**
 * Parses YYYY-MM-DD safely into a local Date without timezone shifting
 */
export function parseDateSafe(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

/**
 * Formats a Date object into YYYY-MM-DD
 */
export function formatDateSafe(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Gets the Monday (week_start) in YYYY-MM-DD for any given date string or Date
 */
export function getMondayOfWeek(dateInput?: string | Date): string {
  let targetDate: Date
  if (!dateInput) {
    targetDate = parseDateSafe(getVietnamTodayString())
  } else if (typeof dateInput === 'string') {
    targetDate = parseDateSafe(dateInput)
  } else {
    targetDate = dateInput
  }

  const monday = startOfWeek(targetDate, { weekStartsOn: 1 })
  return formatDateSafe(monday)
}

/**
 * Gets the Sunday (week_end) in YYYY-MM-DD for a given week Monday
 */
export function getSundayOfWeek(mondayStr: string): string {
  const monday = parseDateSafe(mondayStr)
  const sunday = addDays(monday, 6)
  return formatDateSafe(sunday)
}

/**
 * Shifts week Monday by N weeks (positive or negative)
 */
export function shiftWeekMonday(mondayStr: string, weeks: number): string {
  const monday = parseDateSafe(mondayStr)
  const shifted = weeks >= 0 ? addWeeks(monday, weeks) : subWeeks(monday, Math.abs(weeks))
  return formatDateSafe(shifted)
}

export interface WeekDayInfo {
  dateStr: string // YYYY-MM-DD
  dayOfWeek: number // 1 (Mon) to 7 (Sun)
  dayName: string // "Thứ Hai", "Thứ Ba", ..., "Chủ Nhật"
  shortDayName: string // "T2", "T3", ..., "CN"
  displayDate: string // "DD/MM"
  isToday: boolean
}

const DAY_NAMES = [
  { dayOfWeek: 1, dayName: 'Thứ Hai', shortDayName: 'T2' },
  { dayOfWeek: 2, dayName: 'Thứ Ba', shortDayName: 'T3' },
  { dayOfWeek: 3, dayName: 'Thứ Tư', shortDayName: 'T4' },
  { dayOfWeek: 4, dayName: 'Thứ Năm', shortDayName: 'T5' },
  { dayOfWeek: 5, dayName: 'Thứ Sáu', shortDayName: 'T6' },
  { dayOfWeek: 6, dayName: 'Thứ Bảy', shortDayName: 'T7' },
  { dayOfWeek: 7, dayName: 'Chủ Nhật', shortDayName: 'CN' },
]

/**
 * Returns list of 7 days from Monday to Sunday for the specified week_start
 */
export function getWeekDays(mondayStr: string): WeekDayInfo[] {
  const monday = parseDateSafe(mondayStr)
  const todayStr = getVietnamTodayString()

  return DAY_NAMES.map((meta, index) => {
    const dayDate = addDays(monday, index)
    const dateStr = formatDateSafe(dayDate)
    const displayDate = format(dayDate, 'dd/MM')

    return {
      dateStr,
      dayOfWeek: meta.dayOfWeek,
      dayName: meta.dayName,
      shortDayName: meta.shortDayName,
      displayDate,
      isToday: dateStr === todayStr,
    }
  })
}

/**
 * Formats week range string, e.g. "05/10/2026 - 11/10/2026"
 */
export function formatWeekRange(mondayStr: string): string {
  const monday = parseDateSafe(mondayStr)
  const sunday = addDays(monday, 6)
  return `${format(monday, 'dd/MM/yyyy')} - ${format(sunday, 'dd/MM/yyyy')}`
}

/**
 * Formats a single date nicely, e.g. "Thứ Bảy, 10/10/2026"
 */
export function formatFullDayVietnamese(dateStr: string): string {
  const date = parseDateSafe(dateStr)
  // Get day of week index: 0 is Sun, 1 is Mon...
  const day = date.getDay()
  const dayMap = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  return `${dayMap[day]}, ${format(date, 'dd/MM/yyyy')}`
}

/**
 * Checks if a date string is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getVietnamTodayString()
}
