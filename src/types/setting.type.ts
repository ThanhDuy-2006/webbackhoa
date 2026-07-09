export interface SystemSetting {
  id: string
  key: string
  value: Record<string, unknown>
  updated_at: string
}

export interface GeneralSettings {
  website_name: string
  logo_url: string
  favicon_url: string
  phone: string
  email: string
  zalo: string
  facebook: string
  address: string
  footer_text: string
  terms_of_service: string
  privacy_policy: string
  bank_info: string
}
