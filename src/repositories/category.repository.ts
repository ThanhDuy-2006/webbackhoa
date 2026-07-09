import { createAdminClient } from '@/lib/supabase/admin'
import { Category } from '@/types/category.type'

export const CategoryRepository = {
  async getCategories(page: number, limit: number, search: string = '') {
    const supabase = createAdminClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('categories')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error
    return { data: data as Category[], count: count || 0 }
  },

  async getCategoryById(id: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data as Category
  },

  async createCategory(categoryData: Partial<Category>) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single()

    if (error) throw error
    return data as Category
  },

  async updateCategory(id: string, categoryData: Partial<Category>) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Category
  },

  async softDeleteCategory(id: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('categories')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }
}
