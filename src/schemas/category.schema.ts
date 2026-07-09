import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  slug: z.string().min(1, 'Slug không được để trống').regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
  description: z.string().optional().nullable(),
  image_url: z.string().url('URL ảnh không hợp lệ').optional().nullable(),
  is_active: z.boolean(),
})

export type CategoryFormData = z.infer<typeof categorySchema>
