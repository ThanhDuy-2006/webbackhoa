'use server'

import { SettingService } from '@/services/setting.service'
import { GeneralSettingsFormData } from '@/schemas/setting.schema'
import { revalidatePath } from 'next/cache'

export async function updateGeneralSettingsAction(data: GeneralSettingsFormData) {
  try {
    await SettingService.updateGeneralSettings(data)
    revalidatePath('/')
    revalidatePath('/admin/settings')
    return { success: true }
  } catch (err: unknown) {
    const error = err as any;
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi lưu cài đặt' }
  }
}
