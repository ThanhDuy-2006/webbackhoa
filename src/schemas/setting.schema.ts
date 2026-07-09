import { z } from 'zod'

export const generalSettingsSchema = z.object({
  website_name: z.string().min(1, 'Tên website không được để trống'),
  logo_url: z.string().url('URL logo không hợp lệ').optional().or(z.literal('')),
  favicon_url: z.string().url('URL favicon không hợp lệ').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  zalo: z.string().optional().or(z.literal('')),
  facebook: z.string().url('URL Facebook không hợp lệ').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  footer_text: z.string().optional().or(z.literal('')),
  terms_of_service: z.string().optional().or(z.literal('')),
  privacy_policy: z.string().optional().or(z.literal('')),
  bank_info: z.string().optional().or(z.literal('')),
})

export type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>
