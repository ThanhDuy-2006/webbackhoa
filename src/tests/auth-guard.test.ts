import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock createClient
const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }))
}))

import { assertAdmin, assertAuthenticatedUser } from '@/lib/supabase/auth-guard'

describe('Auth Guards Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('assertAuthenticatedUser', () => {
    it('throws error when user is not logged in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') })

      await expect(assertAuthenticatedUser()).rejects.toThrow('Bạn cần đăng nhập để thực hiện thao tác này')
    })

    it('returns context when user is logged in', async () => {
      const mockUser = { id: 'usr-123', email: 'user@example.com' }
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const result = await assertAuthenticatedUser()
      expect(result.user).toEqual(mockUser)
    })
  })

  describe('assertAdmin', () => {
    it('throws error when user is not logged in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(assertAdmin()).rejects.toThrow('Bạn cần đăng nhập để thực hiện thao tác quản trị')
    })

    it('throws error when logged in user is not an admin', async () => {
      const mockUser = { id: 'usr-123', email: 'user@example.com' }
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSingle.mockResolvedValue({ data: { role: 'user' }, error: null })

      await expect(assertAdmin()).rejects.toThrow('Bạn không có quyền quản trị viên (Admin) để thực hiện thao tác này')
    })

    it('succeeds when logged in user is an admin', async () => {
      const mockAdmin = { id: 'adm-999', email: 'admin@example.com' }
      mockGetUser.mockResolvedValue({ data: { user: mockAdmin }, error: null })
      mockSingle.mockResolvedValue({ data: { role: 'admin' }, error: null })

      const result = await assertAdmin()
      expect(result.user).toEqual(mockAdmin)
    })
  })
})
