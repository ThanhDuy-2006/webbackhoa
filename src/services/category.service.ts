import { CategoryRepository } from '@/repositories/category.repository'
import { CategoryFormData, categorySchema } from '@/schemas/category.schema'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'

const getStorefrontCategoriesCached = unstable_cache(
  async () => {
    return await CategoryRepository.getStorefrontCategories()
  },
  ['storefront-categories-v1'],
  {
    tags: [CACHE_TAGS.CATEGORIES],
    revalidate: 60,
  }
)

export const CategoryService = {
  async getPaginatedCategories(page: number, limit: number, search: string) {
    return await CategoryRepository.getCategories(page, limit, search)
  },

  async getStorefrontCategories() {
    return await getStorefrontCategoriesCached()
  },

  async createCategory(data: CategoryFormData) {
    const validatedData = categorySchema.parse(data)
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
