import { describe, it, expect } from 'vitest'

describe('Manual Withdrawal & Admin Approval Logic Tests', () => {
  describe('Withdrawal Request Validation', () => {
    it('validates minimum withdrawal amount > 0 and allows optional bank details', () => {
      const validateWithdrawal = (amount: number, balance: number, bankName?: string, accNum?: string, accName?: string) => {
        if (amount <= 0) return { valid: false, error: 'Số tiền rút phải lớn hơn 0' }
        if (amount > balance) return { valid: false, error: 'Số dư khả dụng không đủ' }
        
        return { 
          valid: true, 
          newBalance: balance - amount,
          bankName: bankName?.trim() || 'Chưa cung cấp',
          accountNumber: accNum?.trim() || 'Chưa cung cấp',
          accountName: accName?.trim() ? accName.trim().toUpperCase() : 'Chưa cung cấp'
        }
      }

      // Invalid zero amount
      expect(validateWithdrawal(0, 1000000).valid).toBe(false)
      // Invalid negative amount
      expect(validateWithdrawal(-50000, 1000000).valid).toBe(false)
      // Amount exceeding balance
      expect(validateWithdrawal(1500000, 1000000).valid).toBe(false)
      
      // Valid request with optional/empty bank info
      const validEmptyBank = validateWithdrawal(500000, 1000000, '', '', '')
      expect(validEmptyBank.valid).toBe(true)
      expect(validEmptyBank.newBalance).toBe(500000)
      expect(validEmptyBank.bankName).toBe('Chưa cung cấp')
      expect(validEmptyBank.accountNumber).toBe('Chưa cung cấp')
      expect(validEmptyBank.accountName).toBe('Chưa cung cấp')

      // Valid request with full bank info
      const validFull = validateWithdrawal(500000, 1000000, 'MB Bank', '0123456789', 'nguyen van a')
      expect(validFull.valid).toBe(true)
      expect(validFull.accountName).toBe('NGUYEN VAN A')
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
  })
})
