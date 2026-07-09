import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { GeneralSettings } from '@/types/setting.type'

export const SettingRepository = {
  async getGeneralSettings(): Promise<GeneralSettings> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'general')
      .single()

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      // PGRST116 is "not found", 42P01 is "table does not exist"
      console.warn('SettingRepository error:', error.message)
    }

    return data?.value as GeneralSettings || {
      website_name: 'Bách Hóa Online',
      logo_url: '',
      favicon_url: '',
      phone: '',
      email: '',
      zalo: '',
      facebook: '',
      address: '',
      footer_text: '',
      terms_of_service: '',
      privacy_policy: '',
      bank_info: '',
    }
  },

  async updateGeneralSettings(settings: GeneralSettings) {
    const supabase = createAdminClient()
    
    // Upsert
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key: 'general', value: settings }, { onConflict: 'key' })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
