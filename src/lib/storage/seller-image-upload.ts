import { createClient } from '@/lib/supabase/server'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export async function uploadSellerProductImage(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Bạn cần đăng nhập để tải ảnh sản phẩm' }
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: 'Chỉ chấp nhận file ảnh định dạng JPG, PNG hoặc WEBP' }
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { success: false, error: 'Dung lượng ảnh tối đa là 5MB' }
    }

    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      // Fallback if storage bucket doesn't exist yet: return error message
      return { success: false, error: `Lỗi tải ảnh: ${error.message}` }
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path)

    return { success: true, url: publicUrlData.publicUrl }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message || 'Lỗi không xác định khi tải ảnh' }
  }
}
