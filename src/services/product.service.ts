import { ProductRepository } from '@/repositories/product.repository'
import { ProductFormData, productSchema } from '@/schemas/product.schema'

export const ProductService = {
  async getPaginatedProducts(page: number, limit: number, search: string, categoryId?: string) {
    return await ProductRepository.getProducts(page, limit, search, categoryId)
  },

  async getStorefrontProducts(params: { categorySlug?: string, search?: string, sort?: string }) {
    return await ProductRepository.getStorefrontProducts(params)
  },

  async createProduct(data: ProductFormData, adminId: string) {
    const validatedData = productSchema.parse(data)
    
    let finalSlug = validatedData.slug;
    if (!finalSlug) {
      finalSlug = validatedData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
    }

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

    let finalSlug = validatedData.slug;
    if (!finalSlug) {
      finalSlug = validatedData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
    }

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

  async deleteProduct(id: string) {
    return await ProductRepository.softDeleteProduct(id)
  },

  async bulkDeleteProducts(ids: string[]) {
    return await ProductRepository.bulkSoftDeleteProducts(ids)
  }
}
