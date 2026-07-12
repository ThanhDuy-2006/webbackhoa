import { createAdminClient } from '@/lib/supabase/admin'
import { Product, ProductVariant } from '@/types/product.type'

export const ProductRepository = {
  async getProducts(page: number = 1, limit: number = 10, search: string = '', categoryId?: string) {
    const supabase = createAdminClient()
    let query = supabase
      .from('products')
      .select('*, categories(name), variants:product_variants(*)', { count: 'exact' })
      .is('deleted_at', null)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error
    return { data, count: count || 0 }
  },

  async getStorefrontProducts({ categorySlug, search, sort }: { categorySlug?: string, search?: string, sort?: string }) {
    const supabase = createAdminClient()
    let query = supabase
      .from('products')
      .select('*, categories!inner(slug), variants:product_variants(*)', { count: 'exact' })
      .is('deleted_at', null)
      .eq('is_active', true)

    if (categorySlug) {
      query = query.eq('categories.slug', categorySlug)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    switch (sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price', { ascending: false })
        break
      case 'name_asc':
        query = query.order('name', { ascending: true })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data, count, error } = await query

    if (error) throw error
    return { data, count: count || 0 }
  },

  async getProductById(id: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, variants:product_variants(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data as Product
  },

  async getProductBySlug(slug: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name), variants:product_variants(*)')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data
  },

  async createProduct(productData: Partial<Product>, variantsData: Partial<ProductVariant>[], adminId: string) {
    const supabase = createAdminClient()
    
    // 1. Create Product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single()

    if (productError) throw productError

    // 2. Log Inventory for base product if stock > 0
    if (product.stock > 0) {
      await supabase.from('inventory_logs').insert([{
        product_id: product.id,
        type: 'IMPORT',
        qty_before: 0,
        qty_after: product.stock,
        reason: 'Khởi tạo sản phẩm mới',
        created_by: adminId
      }])
    }

    // 3. Create Variants if any
    if (variantsData && variantsData.length > 0) {
      const variantsToInsert = variantsData.map(v => ({
        ...v,
        product_id: product.id
      }))

      const { data: variants, error: variantError } = await supabase
        .from('product_variants')
        .insert(variantsToInsert)
        .select()

      if (variantError) throw variantError

      // Log inventory for variants
      const logs = variants.filter(v => v.stock > 0).map(v => ({
        product_id: product.id,
        variant_id: v.id,
        type: 'IMPORT',
        qty_before: 0,
        qty_after: v.stock,
        reason: 'Khởi tạo phân loại mới',
        created_by: adminId
      }))

      if (logs.length > 0) {
        await supabase.from('inventory_logs').insert(logs)
      }
    }

    return product
  },

  async updateProduct(id: string, productData: Partial<Product>, variantsData: Partial<ProductVariant>[], adminId: string) {
    const supabase = createAdminClient()
    
    // Check old product for inventory logging
    const oldProduct = await this.getProductById(id)

    // 1. Update Product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single()

    if (productError) throw productError

    // Log Inventory if base stock changed
    if (product.stock !== oldProduct.stock) {
      const diff = product.stock - oldProduct.stock
      await supabase.from('inventory_logs').insert([{
        product_id: product.id,
        type: diff > 0 ? 'IMPORT' : 'ADJUST',
        qty_before: oldProduct.stock,
        qty_after: product.stock,
        reason: 'Cập nhật kho từ admin',
        created_by: adminId
      }])
    }

    // 2. Sync Variants
    // For simplicity, if variant has ID -> update. If no ID -> insert. 
    // If old variant not in new list -> deactivate (soft delete).
    
    const newVariantIds = variantsData.filter(v => v.id).map(v => v.id)
    
    // Deactivate missing variants
    const variantsToDeactivate = (oldProduct.variants || [])
      .filter(v => !newVariantIds.includes(v.id))
      .map(v => v.id)
      
    if (variantsToDeactivate.length > 0) {
      await supabase.from('product_variants').update({ is_active: false }).in('id', variantsToDeactivate)
    }

    // Upsert variants
    for (const vData of variantsData) {
      if (vData.id) {
        const oldVar = oldProduct.variants?.find(ov => ov.id === vData.id)
        const { data: updatedVar } = await supabase.from('product_variants').update(vData).eq('id', vData.id).select().single()
        
        if (updatedVar && oldVar && updatedVar.stock !== oldVar.stock) {
          const diff = updatedVar.stock - oldVar.stock
          await supabase.from('inventory_logs').insert([{
            product_id: product.id,
            variant_id: updatedVar.id,
            type: diff > 0 ? 'IMPORT' : 'ADJUST',
            qty_before: oldVar.stock,
            qty_after: updatedVar.stock,
            reason: 'Cập nhật kho phân loại từ admin',
            created_by: adminId
          }])
        }
      } else {
        const { data: newVar } = await supabase.from('product_variants').insert([{ ...vData, product_id: product.id }]).select().single()
        if (newVar && newVar.stock > 0) {
          await supabase.from('inventory_logs').insert([{
            product_id: product.id,
            variant_id: newVar.id,
            type: 'IMPORT',
            qty_before: 0,
            qty_after: newVar.stock,
            reason: 'Thêm phân loại mới',
            created_by: adminId
          }])
        }
      }
    }


    return product
  },

  async softDeleteProduct(id: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)

    if (error) throw error
  }
}
