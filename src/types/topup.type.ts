export interface TopupRequest {
  id: string
  user_id: string
  amount: number
  transfer_content: string
  proof_image_url: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string | null
    email: string | null
  }
}

export interface TopupFilter {
  status?: string
  search?: string
  page?: number
  limit?: number
  userId?: string
}
