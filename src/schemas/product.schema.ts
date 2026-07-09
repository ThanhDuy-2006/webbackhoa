import { z } from 'zod'

export const productVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tên phân loại không được để trống'),
  sku: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Giá không hợp lệ').optional().nullable(),
  stock: z.coerce.number().min(0, 'Tồn kho không hợp lệ'),
  image_url: z.string().url('URL ảnh không hợp lệ').optional().nullable(),
  is_active: z.boolean(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  slug: z.string().or(z.literal('')).optional().nullable(),
  category_id: z.string().uuid('Danh mục không hợp lệ').or(z.literal('')).transform(val => val === '' ? null : val).optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Giá không hợp lệ'),
  sale_price: z.preprocess((val) => val === '' ? null : val, z.coerce.number().min(0, 'Giá khuyến mãi không hợp lệ').optional().nullable()),
  stock: z.coerce.number().min(0, 'Tồn kho không hợp lệ'),
  image_url: z.string().url('URL ảnh không hợp lệ').or(z.literal('')).transform(val => val === '' ? null : val).optional().nullable(),
  images: z.array(z.string().url('URL ảnh không hợp lệ').or(z.literal(''))).default([]).transform(arr => arr.filter(url => url !== '')),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  variants: z.array(productVariantSchema).default([]),
})

export type ProductFormData = z.infer<typeof productSchema>
export type ProductVariantFormData = z.infer<typeof productVariantSchema>
