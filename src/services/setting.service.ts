import { SettingRepository } from '@/repositories/setting.repository'
import { GeneralSettingsFormData, generalSettingsSchema } from '@/schemas/setting.schema'

export const SettingService = {
  async getGeneralSettings() {
    return await SettingRepository.getGeneralSettings()
  },

  async updateGeneralSettings(data: GeneralSettingsFormData) {
    const validatedData = generalSettingsSchema.parse(data)
    return await SettingRepository.updateGeneralSettings(validatedData as any)
  }
}
