import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  const numericAmount = Math.round(Number(amount) || 0)
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(numericAmount) + ' VND'
}
