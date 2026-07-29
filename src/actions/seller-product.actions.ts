'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeSellerProductInput } from '@/schemas/seller-product.schema'
import { ProductRepository } from '@/repositories/product.repository'
async function authenticateSeller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này')
  }
  return { user, supabase }
}

function generateCollisionSafeSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  const shortId = Math.random().toString(36).substring(2, 7)
  return `${baseSlug || 'san-pham'}-${shortId}`
}

export async function createSellerProductAction(rawInput: unknown) {
  try {
    const { user, supabase } = await authenticateSeller()
    const validated = sanitizeSellerProductInput(rawInput)

    const slug = generateCollisionSafeSlug(validated.name)

    // Build seller product DTO explicitly
    const productPayload = {
      seller_id: user.id,
      product_source: 'seller',
      listing_status: validated.listing_status || 'active',
      name: validated.name,
      slug,
      description: validated.description || null,
      category_id: validated.category_id,
      price: validated.price,
      sale_price: validated.sale_price || null,
      stock: validated.stock,
      image_url: validated.image_url || null,
      images: validated.images || [],
      is_active: (validated.listing_status || 'active') === 'active',
      is_featured: false, // Sellers cannot feature their own products
      is_deleted: false,
      image_source: 'manual',
      image_status: 'valid'
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert([productPayload])
      .select()
      .single()

    if (error || !newProduct) {
      throw new Error(`Không thể đăng bán sản phẩm: ${error?.message || ''}`)
    }

    // Insert variants if provided
    if (validated.variants && validated.variants.length > 0) {
      const variantPayloads = validated.variants.map(v => ({
        product_id: newProduct.id,
        name: v.name,
        sku: v.sku || null,
        price: v.price || null,
        stock: v.stock,
        is_active: v.is_active !== false,
      }))

      await supabase.from('product_variants').insert(variantPayloads)
    }

    // Audit log
    await supabase.from('audit_logs').insert([{
      actor_id: user.id,
      action: 'create_seller_product',
      target_table: 'products',
      target_id: newProduct.id,
      payload: { name: newProduct.name, price: newProduct.price }
    }])

    revalidatePath('/')
    revalidatePath('/san-pham')
    revalidatePath('/tai-khoan/san-pham-cua-toi')

    return { success: true, data: newProduct }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message || 'Lỗi khi đăng bán sản phẩm' }
  }
}

export async function updateSellerProductAction(productId: string, rawInput: unknown) {
  try {
    const { user, supabase } = await authenticateSeller()
    const validated = sanitizeSellerProductInput(rawInput)

    // Verify ownership independently
    const { data: existing } = await supabase
      .from('products')
      .select('id, seller_id, slug')
      .eq('id', productId)
      .eq('seller_id', user.id)
      .single()

    if (!existing) {
      throw new Error('Sản phẩm không tồn tại hoặc bạn không có quyền chỉnh sửa sản phẩm này')
    }

    const updatePayload = {
      name: validated.name,
      description: validated.description || null,
      category_id: validated.category_id,
      price: validated.price,
      sale_price: validated.sale_price || null,
      stock: validated.stock,
      image_url: validated.image_url || null,
      images: validated.images || [],
      listing_status: validated.listing_status || 'active',
      is_active: (validated.listing_status || 'active') === 'active',
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId)
      .eq('seller_id', user.id)

    if (updateError) {
      throw new Error(`Lỗi cập nhật sản phẩm: ${updateError.message}`)
    }

    // Manage variants securely (only for this product)
    if (validated.variants) {
      for (const v of validated.variants) {
        if (v.id) {
          await supabase
            .from('product_variants')
            .update({
              name: v.name,
              sku: v.sku || null,
              price: v.price || null,
              stock: v.stock,
              is_active: v.is_active !== false,
            })
            .eq('id', v.id)
            .eq('product_id', productId)
        } else {
          await supabase.from('product_variants').insert([{
            product_id: productId,
            name: v.name,
            sku: v.sku || null,
            price: v.price || null,
            stock: v.stock,
            is_active: v.is_active !== false,
          }])
        }
      }
    }

    revalidatePath('/')
    revalidatePath('/san-pham')
    revalidatePath(`/san-pham/${existing.slug}`)
    revalidatePath('/tai-khoan/san-pham-cua-toi')

    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message || 'Lỗi khi cập nhật sản phẩm' }
  }
}

export async function pauseSellerProductAction(productId: string) {
  try {
    const { user, supabase } = await authenticateSeller()

    const { error } = await supabase
      .from('products')
      .update({ listing_status: 'paused', is_active: false, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('seller_id', user.id)

    if (error) throw new Error('Không thể tạm dừng sản phẩm')

    revalidatePath('/')
    revalidatePath('/san-pham')
    revalidatePath('/tai-khoan/san-pham-cua-toi')
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

export async function activateSellerProductAction(productId: string) {
  try {
    const { user, supabase } = await authenticateSeller()

    const { error } = await supabase
      .from('products')
      .update({ listing_status: 'active', is_active: true, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('seller_id', user.id)

    if (error) throw new Error('Không thể kích hoạt lại sản phẩm')

    revalidatePath('/')
    revalidatePath('/san-pham')
    revalidatePath('/tai-khoan/san-pham-cua-toi')
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

export async function softDeleteSellerProductAction(productId: string) {
  try {
    const { user, supabase } = await authenticateSeller()

    const { error } = await supabase
      .from('products')
      .update({ 
        listing_status: 'deleted', 
        is_deleted: true, 
        is_active: false, 
        deleted_at: new Date().toISOString() 
      })
      .eq('id', productId)
      .eq('seller_id', user.id)

    if (error) throw new Error('Không thể xóa sản phẩm')

    revalidatePath('/')
    revalidatePath('/san-pham')
    revalidatePath('/tai-khoan/san-pham-cua-toi')
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

export async function getSellerProductsAction(page: number = 1, limit: number = 10, search: string = '', status?: string) {
  try {
    const { user } = await authenticateSeller()
    const result = await ProductRepository.getSellerProducts(user.id, page, limit, search, status)
    return { success: true, ...result }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message, data: [], count: 0 }
  }
}
