import { z } from 'zod'

export const sellerProductSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự').max(200, 'Tên sản phẩm tối đa 200 ký tự'),
  description: z.string().nullable().optional(),
  category_id: z.string().min(1, 'Vui lòng chọn danh mục sản phẩm'),
  price: z.number().min(1000, 'Giá sản phẩm tối thiểu 1.000đ'),
  sale_price: z.number().nullable().optional(),
  stock: z.number().int().min(0, 'Tồn kho không được nhỏ hơn 0'),
  image_url: z.string().nullable().optional(),
  images: z.array(z.string()).optional().default([]),
  listing_status: z.enum(['draft', 'active', 'paused']).optional().default('active'),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, 'Tên biến thể không được để trống'),
      sku: z.string().nullable().optional(),
      price: z.number().nullable().optional(),
      stock: z.number().int().min(0),
      is_active: z.boolean().default(true),
    })
  ).optional().default([]),
})

export type SellerProductInput = z.infer<typeof sellerProductSchema>

/**
 * Sanitizes input to strictly strip any system fields injected by malicious users.
 * Strips: seller_id, product_source, is_featured, deleted_at, rating, review_count, system image fields.
 */
export function sanitizeSellerProductInput(input: unknown): SellerProductInput {
  const parsed = sellerProductSchema.parse(input)
  
  if (parsed.sale_price !== null && parsed.sale_price !== undefined && parsed.sale_price >= parsed.price) {
    throw new Error('Giá khuyến mãi phải nhỏ hơn giá gốc sản phẩm')
  }

  return parsed
}
