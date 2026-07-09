export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  subtotal: number
  created_at: string
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
