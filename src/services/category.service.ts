import { CategoryRepository } from '@/repositories/category.repository'
import { CategoryFormData, categorySchema } from '@/schemas/category.schema'

export const CategoryService = {
  async getPaginatedCategories(page: number, limit: number, search: string) {
    return await CategoryRepository.getCategories(page, limit, search)
  },

  async createCategory(data: CategoryFormData) {
    // Validate data
    const validatedData = categorySchema.parse(data)
    
    // Check if slug exists? (In a real scenario, query by slug to check uniqueness, but DB has unique constraint, so it will throw error we can catch)
    return await CategoryRepository.createCategory(validatedData)
  },

  async updateCategory(id: string, data: CategoryFormData) {
    const validatedData = categorySchema.parse(data)
    return await CategoryRepository.updateCategory(id, validatedData)
  },

  async deleteCategory(id: string) {
    return await CategoryRepository.softDeleteCategory(id)
  }
}
