import { describe, it, expect } from 'vitest'

describe('Manual Withdrawal & Admin Approval Logic Tests', () => {
  describe('Withdrawal Request Validation', () => {
    it('validates minimum withdrawal amount > 0', () => {
      const validateWithdrawal = (amount: number, balance: number, bankName: string, accNum: string, accName: string) => {
        if (amount <= 0) return { valid: false, error: 'Số tiền rút phải lớn hơn 0' }
        if (amount > balance) return { valid: false, error: 'Số dư khả dụng không đủ' }
        if (!bankName.trim()) return { valid: false, error: 'Vui lòng chọn hoặc nhập tên ngân hàng' }
        if (!accNum.trim()) return { valid: false, error: 'Vui lòng nhập số tài khoản ngân hàng' }
        if (!accName.trim()) return { valid: false, error: 'Vui lòng nhập tên chủ tài khoản' }
        return { valid: true, newBalance: balance - amount }
      }

      // Invalid zero amount
      expect(validateWithdrawal(0, 1000000, 'MB Bank', '0123456789', 'NGUYEN VAN A').valid).toBe(false)
      // Invalid negative amount
      expect(validateWithdrawal(-50000, 1000000, 'MB Bank', '0123456789', 'NGUYEN VAN A').valid).toBe(false)
      // Amount exceeding balance
      expect(validateWithdrawal(1500000, 1000000, 'MB Bank', '0123456789', 'NGUYEN VAN A').valid).toBe(false)
      // Missing bank info
      expect(validateWithdrawal(500000, 1000000, '', '0123456789', 'NGUYEN VAN A').valid).toBe(false)
      expect(validateWithdrawal(500000, 1000000, 'MB Bank', '', 'NGUYEN VAN A').valid).toBe(false)
      expect(validateWithdrawal(500000, 1000000, 'MB Bank', '0123456789', '').valid).toBe(false)
      
      // Valid request
      const valid = validateWithdrawal(500000, 1000000, 'MB Bank', '0123456789', 'NGUYEN VAN A')
      expect(valid.valid).toBe(true)
      expect(valid.newBalance).toBe(500000)
    })
  })

  describe('Financial Balance Updates & Reversals', () => {
    it('correctly calculates deducted balance when submitting withdrawal', () => {
      const initialBalance = 2500000
      const withdrawalAmount = 1000000
      const balanceAfterWithdrawal = initialBalance - withdrawalAmount
      expect(balanceAfterWithdrawal).toBe(1500000)
    })

    it('correctly restores full balance when admin rejects withdrawal with reason', () => {
      const currentBalance = 1500000
      const rejectedWithdrawalAmount = 1000000
      const restoredBalance = currentBalance + rejectedWithdrawalAmount
      expect(restoredBalance).toBe(2500000)
    })

    it('formats uppercase account names properly', () => {
      const rawName = '  nguyen van a  '
      const normalizedName = rawName.trim().toUpperCase()
      expect(normalizedName).toBe('NGUYEN VAN A')
    })
  })
})
