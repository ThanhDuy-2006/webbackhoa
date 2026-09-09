import { format, differenceInCalendarDays, parseISO, isValid } from 'date-fns'

export type ExpiryStatusType = 'valid' | 'warning' | 'expired' | 'none'

export interface ExpiryInfo {
  status: ExpiryStatusType
  daysLeft: number | null
  label: string
  formattedDate: string | null
  badgeClass: string
  isUrgent: boolean
}

/**
 * Calculates the expiry status and human-friendly badge info for a product.
 */
export function getExpiryInfo(expiryDate: string | Date | null | undefined): ExpiryInfo {
  if (!expiryDate) {
    return {
      status: 'none',
      daysLeft: null,
      label: 'Chưa có HSD',
      formattedDate: null,
      badgeClass: 'hidden',
      isUrgent: false,
    }
  }

  const date = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate
  if (!isValid(date)) {
    return {
      status: 'none',
      daysLeft: null,
      label: 'HSD không hợp lệ',
      formattedDate: null,
      badgeClass: 'hidden',
      isUrgent: false,
    }
  }

  const today = new Date()
  const daysLeft = differenceInCalendarDays(date, today)
  const formattedDate = format(date, 'dd/MM/yyyy')

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft)
    return {
      status: 'expired',
      daysLeft,
      label: overdueDays === 1 ? 'Đã quá hạn 1 ngày' : `Đã quá hạn ${overdueDays} ngày`,
      formattedDate,
      badgeClass: 'bg-rose-100 text-rose-700 border-rose-300 font-semibold',
      isUrgent: true,
    }
  }

  if (daysLeft === 0) {
    return {
      status: 'warning',
      daysLeft: 0,
      label: 'Hết hạn hôm nay!',
      formattedDate,
      badgeClass: 'bg-amber-500 text-white border-amber-600 font-bold animate-pulse',
      isUrgent: true,
    }
  }

  if (daysLeft <= 3) {
    return {
      status: 'warning',
      daysLeft,
      label: `Cận date: Còn ${daysLeft} ngày`,
      formattedDate,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
      isUrgent: true,
    }
  }

  if (daysLeft <= 7) {
    return {
      status: 'warning',
      daysLeft,
      label: `Còn ${daysLeft} ngày`,
      formattedDate,
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      isUrgent: true,
    }
  }

  return {
    status: 'valid',
    daysLeft,
    label: `HSD: ${formattedDate}`,
    formattedDate,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    isUrgent: false,
  }
}

/**
 * Returns a date string (YYYY-MM-DD) by adding N days to the current date.
 */
export function addDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return format(d, 'yyyy-MM-dd')
}
