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
        const itemStock = typeof newItem.stock === 'number' && !isNaN(newItem.stock) && newItem.stock > 0 ? newItem.stock : 9999
        const itemPrice = typeof newItem.price === 'number' && !isNaN(newItem.price) ? newItem.price : 0
        const itemQty = typeof newItem.quantity === 'number' && !isNaN(newItem.quantity) && newItem.quantity > 0 ? newItem.quantity : 1

        const cleanNewItem: CartItem = {
          ...newItem,
          price: itemPrice,
          quantity: itemQty,
          stock: itemStock
        }

        const existingItem = state.items.find(
          item => item.id === cleanNewItem.id && item.variantId === cleanNewItem.variantId
        )

        if (existingItem) {
          const maxStock = typeof existingItem.stock === 'number' && !isNaN(existingItem.stock) && existingItem.stock > 0 
            ? existingItem.stock 
            : itemStock
          const currentQty = typeof existingItem.quantity === 'number' && !isNaN(existingItem.quantity) ? existingItem.quantity : 1

          return {
            items: state.items.map(item =>
              item.id === cleanNewItem.id && item.variantId === cleanNewItem.variantId
                ? { ...item, stock: maxStock, quantity: Math.min(maxStock, currentQty + cleanNewItem.quantity) }
                : item
            )
          }
        }
        return { items: [...state.items, cleanNewItem] }
      }),
      removeItem: (id, variantId) => set((state) => ({
        items: state.items.filter(item => !(item.id === id && (variantId ? item.variantId === variantId : !item.variantId)))
      })),
      updateQuantity: (id, variantId, quantity) => set((state) => ({
        items: state.items.map(item => {
          if (item.id === id && (variantId ? item.variantId === variantId : !item.variantId)) {
            const maxStock = typeof item.stock === 'number' && !isNaN(item.stock) && item.stock > 0 ? item.stock : 9999
            const targetQty = typeof quantity === 'number' && !isNaN(quantity) ? quantity : 1
            return { ...item, quantity: Math.min(maxStock, Math.max(1, targetQty)) }
          }
          return item
        })
      })),
      clearCart: () => set({ items: [] })
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
