'use server'

import { ProductService } from '@/services/product.service'
import { ProductFormData } from '@/schemas/product.schema'
import { revalidatePath, revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { assertAdmin } from '@/lib/supabase/auth-guard'

export async function createProductAction(data: ProductFormData) {
  try {
    const { user } = await assertAdmin()
    const product = await ProductService.createProduct(data, user.id)
    revalidatePath('/admin/products')
    revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max')
    return { success: true, data: product }
  } catch (err: unknown) {
    const error = err as any;
    if (error?.code === '23505') {
      return { success: false, error: 'Đường dẫn (slug) đã tồn tại' }
    }
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi tạo sản phẩm' }
  }
}

export async function updateProductAction(id: string, data: ProductFormData, oldSlug?: string) {
  try {
    const { user } = await assertAdmin()
    const product = await ProductService.updateProduct(id, data, user.id)
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${id}`)
    
    if (oldSlug && oldSlug !== product.slug) {
      revalidatePath(`/san-pham/${oldSlug}`)
    }
    if (product?.slug) {
      revalidatePath(`/san-pham/${product.slug}`)
    }

    revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max')
    return { success: true, data: product }
  } catch (err: unknown) {
    const error = err as any;
    if (error?.code === '23505') {
      return { success: false, error: 'Đường dẫn (slug) đã tồn tại' }
    }
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi cập nhật sản phẩm' }
  }
}

export async function deleteProductAction(id: string) {
  try {
    await assertAdmin()
    await ProductService.deleteProduct(id)
    revalidatePath('/admin/products')
    revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max')
    return { success: true }
  } catch (err: unknown) {
    const error = err as any;
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi xóa sản phẩm' }
  }
}

export async function bulkDeleteProductsAction(ids: string[]) {
  try {
    await assertAdmin()
    await ProductService.bulkDeleteProducts(ids)
    revalidatePath('/admin/products')
    revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max')
    return { success: true }
  } catch (err: unknown) {
    const error = err as any;
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi xóa danh sách sản phẩm' }
  }
}

export async function bulkCreateProductsAction(productsData: ProductFormData[]) {
  try {
    const { user } = await assertAdmin()
    const results = { success: 0, merged: 0, failed: 0, errors: [] as string[] }
    
    // Deduplicate in batch array first
    const mergedMap = new Map<string, ProductFormData>()

    for (const item of productsData) {
      const cleanName = item.name.trim().toLowerCase()
      const key = `${cleanName}___${item.price}`
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!
        existing.stock += item.stock
        if (!existing.image_url && item.image_url) {
          existing.image_url = item.image_url
          existing.images = [item.image_url]
        }
      } else {
        mergedMap.set(key, { ...item })
      }
    }

    for (const data of Array.from(mergedMap.values())) {
      try {
        const res = await ProductService.upsertImportProduct(data, user.id)
        if (res.action === 'merged') {
          results.merged++
        } else {
          results.success++
        }
      } catch (err: unknown) {
        const error = err as any
        results.failed++
        results.errors.push(`Lỗi khi xử lý "${data.name}": ${error?.message || 'Lỗi không xác định'}`)
      }
    }

    revalidatePath('/admin/products')
    revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max')
    
    return { success: true, results }
  } catch (err: unknown) {
    const error = err as any
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi thực hiện import' }
  }
}

