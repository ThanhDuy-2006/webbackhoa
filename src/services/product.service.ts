import { ProductRepository } from '@/repositories/product.repository'
import { ProductFormData, productSchema } from '@/schemas/product.schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'

const getStorefrontProductsCached = unstable_cache(
  async (params: { categorySlug?: string; search?: string; sort?: string; page?: number; pageSize?: number }) => {
    return await ProductRepository.getStorefrontProducts(params)
  },
  ['storefront-products-v1'],
  {
    tags: [CACHE_TAGS.STOREFRONT_PRODUCTS],
    revalidate: 60,
  }
)

export const ProductService = {
  async generateUniqueSlug(baseSlug: string, currentProductId?: string): Promise<string> {
    const supabase = createAdminClient()
    let slug = baseSlug || 'san-pham'
    let counter = 1

    while (true) {
      let query = supabase.from('products').select('id').eq('slug', slug)
      if (currentProductId) {
        query = query.neq('id', currentProductId)
      }
      const { data } = await query.maybeSingle()

      if (!data) {
        return slug
      }

      slug = `${baseSlug}-${counter}`
      counter++
    }
  },

  async getPaginatedProducts(page: number, limit: number, search: string, categoryId?: string) {
    return await ProductRepository.getProducts(page, limit, search, categoryId)
  },

  async getStorefrontProducts(params: { categorySlug?: string; search?: string; sort?: string; page?: number; pageSize?: number }) {
    return await getStorefrontProductsCached(params)
  },

  async getProductQuickViewById(id: string) {
    return await ProductRepository.getProductQuickViewById(id)
  },

  async createProduct(data: ProductFormData, adminId: string) {
    const validatedData = productSchema.parse(data)
    
    let baseSlug = validatedData.slug;
    if (!baseSlug) {
      baseSlug = validatedData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
    }

    const finalSlug = await this.generateUniqueSlug(baseSlug);

    const productData = {
      name: validatedData.name,
      slug: finalSlug,
      category_id: validatedData.category_id,
      description: validatedData.description,
      price: validatedData.price,
      sale_price: validatedData.sale_price,
      stock: validatedData.stock,
      image_url: validatedData.image_url,
      images: validatedData.images,
      is_active: validatedData.is_active,
      is_featured: validatedData.is_featured,
    }

    return await ProductRepository.createProduct(productData, validatedData.variants, adminId)
  },

  async updateProduct(id: string, data: ProductFormData, adminId: string) {
    const validatedData = productSchema.parse(data)

    let baseSlug = validatedData.slug;
    if (!baseSlug) {
      baseSlug = validatedData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
    }

    const finalSlug = await this.generateUniqueSlug(baseSlug, id);

    const productData = {
      name: validatedData.name,
      slug: finalSlug,
      category_id: validatedData.category_id,
      description: validatedData.description,
      price: validatedData.price,
      sale_price: validatedData.sale_price,
      stock: validatedData.stock,
      image_url: validatedData.image_url,
      images: validatedData.images,
      is_active: validatedData.is_active,
      is_featured: validatedData.is_featured,
    }

    return await ProductRepository.updateProduct(id, productData, validatedData.variants, adminId)
  },

  async getProductById(id: string) {
    return await ProductRepository.getProductById(id)
  },

  async getProductBySlug(slug: string) {
    return await ProductRepository.getProductBySlug(slug)
  },

  async upsertImportProduct(data: ProductFormData, adminId: string): Promise<{ action: 'created' | 'merged'; id: string }> {
    const validatedData = productSchema.parse(data)
    const supabase = createAdminClient()

    const cleanName = validatedData.name.trim()
    const { data: existingList } = await supabase
      .from('products')
      .select('id, name, price, stock, image_url, images')
      .is('deleted_at', null)
      .ilike('name', cleanName)
      .eq('price', validatedData.price)
      .limit(1)

    const existingProduct = existingList && existingList.length > 0 ? existingList[0] : null

    if (existingProduct) {
      const newStock = Number(existingProduct.stock || 0) + Number(validatedData.stock || 0)

      const finalImageUrl = existingProduct.image_url || validatedData.image_url || null
      const finalImages = existingProduct.image_url 
        ? (existingProduct.images || [existingProduct.image_url])
        : (validatedData.image_url ? [validatedData.image_url] : [])

      await supabase
        .from('products')
        .update({
          stock: newStock,
          image_url: finalImageUrl,
          images: finalImages,
          image_status: finalImageUrl ? 'valid' : 'unchecked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProduct.id)

      if (validatedData.stock > 0) {
        await supabase.from('inventory_logs').insert([{
          product_id: existingProduct.id,
          type: 'IMPORT',
          qty_before: existingProduct.stock || 0,
          qty_after: newStock,
          reason: 'Cập nhật tồn kho qua nhập hàng (Gộp sản phẩm)',
          created_by: adminId
        }])
      }

      return { action: 'merged', id: existingProduct.id }
    } else {
      const created = await this.createProduct(validatedData, adminId)
      return { action: 'created', id: created.id }
    }
  },

  async deleteProduct(id: string) {
    return await ProductRepository.softDeleteProduct(id)
  },

  async bulkDeleteProducts(ids: string[]) {
    return await ProductRepository.bulkSoftDeleteProducts(ids)
  }
}
