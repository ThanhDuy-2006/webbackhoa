import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  variantId?: string
  variantName?: string
  stock: number
}

interface CartState {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string, variantId?: string) => void
  updateQuantity: (id: string, variantId: string | undefined, quantity: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      isOpen: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      items: [],
      addItem: (newItem) => set((state) => {
        const existingItem = state.items.find(
          item => item.id === newItem.id && item.variantId === newItem.variantId
        )
        if (existingItem) {
          return {
            items: state.items.map(item =>
              item.id === newItem.id && item.variantId === newItem.variantId
                ? { ...item, quantity: Math.min(item.stock, item.quantity + newItem.quantity) }
                : item
            )
          }
        }
        return { items: [...state.items, newItem] }
      }),
      removeItem: (id, variantId) => set((state) => ({
        items: state.items.filter(item => !(item.id === id && item.variantId === variantId))
      })),
      updateQuantity: (id, variantId, quantity) => set((state) => ({
        items: state.items.map(item =>
          item.id === id && item.variantId === variantId
            ? { ...item, quantity: Math.min(item.stock, Math.max(1, quantity)) }
            : item
        )
      })),
      clearCart: () => set({ items: [] })
    }),
    {
      name: 'cart-storage',
    }
  )
)
