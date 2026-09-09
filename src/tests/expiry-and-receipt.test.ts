import { describe, it, expect } from 'vitest'
import { getExpiryInfo, addDaysFromNow } from '../lib/expiry-utils'
import { productSchema } from '../schemas/product.schema'
import { sanitizeSellerProductInput } from '../schemas/seller-product.schema'
import { format, addDays, subDays } from 'date-fns'

describe('Expiry Utils & FIFO Date Tracking Tests', () => {
  it('returns status none when expiry_date is null or undefined', () => {
    expect(getExpiryInfo(null).status).toBe('none')
    expect(getExpiryInfo(undefined).status).toBe('none')
    expect(getExpiryInfo('').status).toBe('none')
  })

  it('identifies future product as valid and not urgent', () => {
    const futureDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')
    const info = getExpiryInfo(futureDate)

    expect(info.status).toBe('valid')
    expect(info.isUrgent).toBe(false)
    expect(info.daysLeft).toBeGreaterThan(7)
  })

  it('identifies product expiring in 3 days as warning and urgent', () => {
    const soonDate = format(addDays(new Date(), 3), 'yyyy-MM-dd')
    const info = getExpiryInfo(soonDate)

    expect(info.status).toBe('warning')
    expect(info.isUrgent).toBe(true)
    expect(info.daysLeft).toBe(3)
    expect(info.label).toContain('Còn 3 ngày')
  })

  it('identifies product expiring today as warning and urgent', () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const info = getExpiryInfo(todayStr)

    expect(info.status).toBe('warning')
    expect(info.isUrgent).toBe(true)
    expect(info.daysLeft).toBe(0)
    expect(info.label).toBe('Hết hạn hôm nay!')
  })

  it('identifies expired product as expired and urgent', () => {
    const expiredDate = format(subDays(new Date(), 2), 'yyyy-MM-dd')
    const info = getExpiryInfo(expiredDate)

    expect(info.status).toBe('expired')
    expect(info.isUrgent).toBe(true)
    expect(info.daysLeft).toBe(-2)
    expect(info.label).toContain('Đã quá hạn 2 ngày')
  })

  it('correctly formats addDaysFromNow', () => {
    const sevenDaysLater = addDaysFromNow(7)
    expect(sevenDaysLater).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('Product Schemas Expiry Date Validation', () => {
  it('allows optional valid expiry_date in productSchema', () => {
    const input = {
      name: 'Rau cải xanh 500g',
      category_id: 'cat-123',
      price: 15000,
      stock: 5,
      expiry_date: '2026-10-01',
      is_active: true,
      is_featured: false,
    }

    const parsed = productSchema.parse(input)
    expect(parsed.expiry_date).toBe('2026-10-01')
  })

  it('allows optional valid expiry_date in sellerProductSchema', () => {
    const input = {
      name: 'Thịt bò Úc 500g',
      category_id: 'cat-456',
      price: 180000,
      stock: 2,
      expiry_date: '2026-09-15',
    }

    const sanitized = sanitizeSellerProductInput(input)
    expect(sanitized.expiry_date).toBe('2026-09-15')
  })
})
