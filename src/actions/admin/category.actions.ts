'use server'

import { CategoryService } from '@/services/category.service'
import { CategoryFormData } from '@/schemas/category.schema'
import { revalidatePath } from 'next/cache'

export async function createCategoryAction(data: CategoryFormData) {
  try {
    const category = await CategoryService.createCategory(data)
    revalidatePath('/admin/categories')
    return { success: true, data: category }
  } catch (err: unknown) {
    const error = err as any;
    if (error?.code === '23505') {
      return { success: false, error: 'Đường dẫn (slug) đã tồn tại' }
    }
    return { success: false, error: error.message || 'Có lỗi xảy ra khi tạo danh mục' }
  }
}

export async function updateCategoryAction(id: string, data: CategoryFormData) {
  try {
    const category = await CategoryService.updateCategory(id, data)
    revalidatePath('/admin/categories')
    return { success: true, data: category }
  } catch (err: unknown) {
    const error = err as any;
    if (error?.code === '23505') {
      return { success: false, error: 'Đường dẫn (slug) đã tồn tại' }
    }
    return { success: false, error: error.message || 'Có lỗi xảy ra khi cập nhật danh mục' }
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    await CategoryService.deleteCategory(id)
    revalidatePath('/admin/categories')
    return { success: true }
  } catch (err: unknown) {
    const error = err as any;
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi xóa danh mục' }
  }
}
