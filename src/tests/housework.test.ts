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
})
