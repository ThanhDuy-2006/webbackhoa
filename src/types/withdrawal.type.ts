export type WithdrawalStatus = 'pending' | 'approved' | 'rejected'

export interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  bank_name: string
  account_number: string
  account_name: string
  status: WithdrawalStatus
  admin_note: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string | null
    email: string | null
  }
}

export interface WithdrawalFilter {
  status?: string
  search?: string
  page?: number
  limit?: number
  userId?: string
}
