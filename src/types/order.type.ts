export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  subtotal: number
  created_at: string
  seller_id?: string | null
  unit_price?: number
  platform_fee_bps?: number
  platform_fee?: number
  seller_amount?: number
  seller_payment_status?: 'pending' | 'available' | 'withdrawn' | 'refunded'
  seller_order_id?: string | null
}

export interface SellerOrder {
  id: string
  parent_order_id: string
  seller_id: string
  buyer_id: string
  subtotal: number
  platform_fee_bps: number
  platform_fee: number
  seller_earnings: number
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled' | 'refunded'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  created_at: string
  updated_at: string
  buyer_profile?: { full_name: string | null; email: string | null; phone: string | null }
  parent_order?: { order_code: string; receiver_name: string; receiver_phone: string; receiver_address: string }
  order_items?: OrderItem[]
}

export interface SellerWallet {
  seller_id: string
  pending_balance: number
  available_balance: number
  reserved_balance: number
  withdrawn_balance: number
  created_at: string
  updated_at: string
}

export interface SellerLedgerTransaction {
  id: string
  seller_id: string
  seller_order_id: string | null
  type: 'sale_pending' | 'sale_completed' | 'refund' | 'cancellation' | 'withdrawal_reserved' | 'withdrawal_completed' | 'withdrawal_rejected' | 'adjustment'
  amount: number
  platform_fee: number
  balance_before: number
  balance_after: number
  description: string | null
  created_at: string
}

export interface SellerWithdrawal {
  id: string
  seller_id: string
  amount: number
  bank_name: string
  account_number: string
  account_name: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string | null
  processed_by?: string | null
  processed_at?: string | null
  created_at: string
}

export interface MarketplaceSettings {
  id: 'default'
  platform_fee_bps: number
  updated_by?: string | null
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  order_code: string
  total_amount: number
  discount_amount: number
  final_amount: number
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled' | 'refunded'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  payment_method: 'wallet'
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  note: string | null
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string | null
    email: string | null
  }
  order_items?: OrderItem[]
}

export interface OrderFilter {
  status?: string
  search?: string
  page?: number
  limit?: number
  userId?: string
}
