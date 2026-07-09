export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}
