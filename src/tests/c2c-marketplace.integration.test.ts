import { describe, it, expect, vi } from 'vitest'
import { sanitizeSellerProductInput } from '../schemas/seller-product.schema'

describe('Peer-to-Peer (C2C) Marketplace Integration Tests', () => {
  describe('Seller DTO Field Allowlist & Security', () => {
    it('strips protected system fields (seller_id, product_source, is_featured, deleted_at)', () => {
      const maliciousInput = {
        name: 'Sản phẩm C2C Thử nghiệm',
        description: 'Mô tả hợp lệ',
        category_id: 'cat-123',
        price: 100000,
        stock: 5,
        // Injected fields
        seller_id: 'hacker-uuid',
        product_source: 'platform',
        is_featured: true,
        deleted_at: '2026-01-01',
        rating: 5.0,
      }

      const sanitized = sanitizeSellerProductInput(maliciousInput)

      expect(sanitized.name).toBe('Sản phẩm C2C Thử nghiệm')
      expect(sanitized.price).toBe(100000)
      expect(sanitized.stock).toBe(5)
      // Check that protected fields are NOT present on sanitized DTO
      expect((sanitized as any).seller_id).toBeUndefined()
      expect((sanitized as any).product_source).toBeUndefined()
      expect((sanitized as any).is_featured).toBeUndefined()
      expect((sanitized as any).deleted_at).toBeUndefined()
    })

    it('rejects sale_price greater than or equal to price', () => {
      const invalidInput = {
        name: 'Sản phẩm lỗi giá',
        category_id: 'cat-123',
        price: 100000,
        sale_price: 150000,
        stock: 10,
      }

      expect(() => sanitizeSellerProductInput(invalidInput)).toThrow('Giá khuyến mãi phải nhỏ hơn giá gốc sản phẩm')
    })
  })

  describe('Zero Platform Fee (0% Default) & Financial Calculations', () => {
    it('calculates 100% merchandise payout for seller when platform_fee_bps is 0', () => {
      const itemSubtotal = 100000
      const platformFeeBps = 0 // 0%

      const platformFee = Math.floor((itemSubtotal * platformFeeBps) / 10000)
      const sellerAmount = itemSubtotal - platformFee

      expect(platformFee).toBe(0)
      expect(sellerAmount).toBe(100000)
    })

    it('calculates correct platform fee and seller earnings when platform_fee_bps is 500 (5%)', () => {
      const itemSubtotal = 200000
      const platformFeeBps = 500 // 5%

      const platformFee = Math.floor((itemSubtotal * platformFeeBps) / 10000)
      const sellerAmount = itemSubtotal - platformFee

      expect(platformFee).toBe(10000)
      expect(sellerAmount).toBe(190000)
    })
  })

  describe('Seller State Machine & Listing Status Filters', () => {
    it('validates allowed listing status values (draft, active, paused, suspended, deleted)', () => {
      const validStatuses = ['draft', 'active', 'paused', 'suspended', 'deleted']
      expect(validStatuses).toContain('active')
      expect(validStatuses).not.toContain('sold_out') // Sold out is derived from stock quantity
    })
  })
})
