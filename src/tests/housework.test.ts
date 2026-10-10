import { describe, it, expect } from 'vitest'
import { 
  getMondayOfWeek, 
  getSundayOfWeek, 
  shiftWeekMonday, 
  getWeekDays, 
  formatWeekRange, 
  parseDateSafe, 
  formatDateSafe 
} from '@/lib/housework-date'

describe('Housework Date Utilities', () => {
  it('correctly calculates Monday of the week for any date', () => {
    // 2026-10-10 is a Saturday
    const monday = getMondayOfWeek('2026-10-10')
    expect(monday).toBe('2026-10-05')

    // 2026-10-05 is a Monday
    const mondayFromMonday = getMondayOfWeek('2026-10-05')
    expect(mondayFromMonday).toBe('2026-10-05')

    // 2026-10-11 is a Sunday
    const mondayFromSunday = getMondayOfWeek('2026-10-11')
    expect(mondayFromSunday).toBe('2026-10-05')
  })

  it('correctly calculates Sunday of the week', () => {
    const sunday = getSundayOfWeek('2026-10-05')
    expect(sunday).toBe('2026-10-11')
  })

  it('shifts week forward and backward accurately', () => {
    const nextWeek = shiftWeekMonday('2026-10-05', 1)
    expect(nextWeek).toBe('2026-10-12')

    const prevWeek = shiftWeekMonday('2026-10-05', -1)
    expect(prevWeek).toBe('2026-09-28')
  })

  it('generates 7 continuous days from Monday to Sunday', () => {
    const days = getWeekDays('2026-10-05')
    expect(days).toHaveLength(7)
    expect(days[0].dateStr).toBe('2026-10-05')
    expect(days[0].dayName).toBe('Thứ Hai')
    expect(days[0].shortDayName).toBe('T2')

    expect(days[6].dateStr).toBe('2026-10-11')
    expect(days[6].dayName).toBe('Chủ Nhật')
    expect(days[6].shortDayName).toBe('CN')
  })

  it('formats week range in Vietnamese standard format DD/MM/YYYY', () => {
    const range = formatWeekRange('2026-10-05')
    expect(range).toBe('05/10/2026 - 11/10/2026')
  })

  it('roundtrips parsing and formatting without timezone shifting', () => {
    const dateStr = '2026-12-31'
    const date = parseDateSafe(dateStr)
    const formatted = formatDateSafe(date)
    expect(formatted).toBe(dateStr)
  })
})

describe('Housework Assignment Rotation Logic', () => {
  it('correctly rotates users in round-robin fashion', () => {
    const users = ['user_duy', 'user_huy', 'user_nam']
    
    // Rotation mapping: user[i] -> user[(i + 1) % users.length]
    const getNextAssignee = (currentUserId: string) => {
      const idx = users.indexOf(currentUserId)
      return users[(idx + 1) % users.length]
    }

    expect(getNextAssignee('user_duy')).toBe('user_huy')
    expect(getNextAssignee('user_huy')).toBe('user_nam')
    expect(getNextAssignee('user_nam')).toBe('user_duy')
  })

  it('handles more tasks than users cleanly', () => {
    const users = ['user_A', 'user_B']
    const tasks = [
      { id: '1', title: 'Quét nhà', assignee: 'user_A' },
      { id: '2', title: 'Lau nhà', assignee: 'user_B' },
      { id: '3', title: 'Đổ rác', assignee: 'user_A' },
      { id: '4', title: 'Rửa chén', assignee: 'user_B' },
    ]

    const rotateTaskAssignee = (assignee: string) => {
      const idx = users.indexOf(assignee)
      return users[(idx + 1) % users.length]
    }

    const rotated = tasks.map(t => ({
      ...t,
      assignee: rotateTaskAssignee(t.assignee)
    }))

    expect(rotated[0].assignee).toBe('user_B')
    expect(rotated[1].assignee).toBe('user_A')
    expect(rotated[2].assignee).toBe('user_B')
    expect(rotated[3].assignee).toBe('user_A')
  })

  it('calculates automated weekly rotation accurately according to prompt specification', async () => {
    const { getSaturdayOfWeek, formatDayMonthYear, getRotationAssigneeForWeek } = await import('@/lib/housework-date')

    const members = [
      { name: 'Duy', id: '1' },
      { name: 'Huy', id: '2' },
      { name: 'Nam', id: '3' }
    ]

    const startDate = '2026-10-12' // Monday

    // Week 1: 12/10 – 18/10/2026 -> Duy (17/10 và 18/10)
    const week1 = getRotationAssigneeForWeek('2026-10-12', startDate, members)
    expect(week1.assignee?.name).toBe('Duy')
    expect(formatDayMonthYear(getSaturdayOfWeek('2026-10-12'))).toBe('17/10/2026')
    expect(formatDayMonthYear(getSundayOfWeek('2026-10-12'))).toBe('18/10/2026')

    // Week 2: 19/10 – 25/10/2026 -> Huy (24/10 và 25/10)
    const week2 = getRotationAssigneeForWeek('2026-10-19', startDate, members)
    expect(week2.assignee?.name).toBe('Huy')
    expect(formatDayMonthYear(getSaturdayOfWeek('2026-10-19'))).toBe('24/10/2026')
    expect(formatDayMonthYear(getSundayOfWeek('2026-10-19'))).toBe('25/10/2026')

    // Week 3: 26/10 – 01/11/2026 -> Nam (31/10 và 01/11)
    const week3 = getRotationAssigneeForWeek('2026-10-26', startDate, members)
    expect(week3.assignee?.name).toBe('Nam')
    expect(formatDayMonthYear(getSaturdayOfWeek('2026-10-26'))).toBe('31/10/2026')
    expect(formatDayMonthYear(getSundayOfWeek('2026-10-26'))).toBe('01/11/2026')

    // Week 4: 02/11 – 08/11/2026 -> Duy (07/11 và 08/11) - vòng lặp quay lại Duy
    const week4 = getRotationAssigneeForWeek('2026-11-02', startDate, members)
    expect(week4.assignee?.name).toBe('Duy')
    expect(formatDayMonthYear(getSaturdayOfWeek('2026-11-02'))).toBe('07/11/2026')
    expect(formatDayMonthYear(getSundayOfWeek('2026-11-02'))).toBe('08/11/2026')
  })
})
