'use server'

import { ImageService } from '@/lib/images/image-service'
import { CandidateSessionService } from '@/lib/images/candidate-session-service'
import { validateImageUrl } from '@/lib/images/image-validator'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getAdminId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  
  return user.id
}

export async function generateProductImageAction(
  productName: string, 
  productId?: string | null, 
  formSessionId?: string | null,
  bypassCache = false, 
  excludeUrl?: string,
  previousSessionId?: string | null
) {
  try {
    const adminId = await getAdminId()
    
    if (!productName || productName.trim().length < 2) {
      return { status: 'error' as const, message: 'Tên sản phẩm quá ngắn để tìm kiếm ảnh.' }
    }

    const result = await ImageService.generateProductImage({
      productName,
      productId,
      formSessionId,
      adminId,
      bypassCache,
      excludeUrl,
      previousSessionId
    });

    if (productId && result.status === 'auto_selected') {
      revalidatePath('/admin/products')
      revalidatePath(`/admin/products/${productId}`)
    }

    return result;
  } catch (err: unknown) {
    console.error('[GenerateProductImageAction] Error:', err);
    return { status: 'error' as const, message: 'Không thể tự động tạo ảnh lúc này. Vui lòng thử lại sau.' }
  }
}

export async function selectManualCandidateAction({
  productId,
  formSessionId,
  candidateSessionId,
  candidateId,
  expectedImageUrl,
  expectedUpdatedAt,
}: {
  productId?: string | null;
  formSessionId?: string | null;
  candidateSessionId: string;
  candidateId: string;
  expectedImageUrl?: string | null;
  expectedUpdatedAt?: string | null;
}) {
  try {
    const adminId = await getAdminId();

    // 1. Verify candidate session and resolve trusted candidate URL
    const { url: trustedUrl, sessionId } = await CandidateSessionService.verifyAndResolveCandidate({
      candidateSessionId,
      candidateId,
      adminId,
      productId,
      formSessionId,
    });

    // 2. Revalidate URL server-side before persisting
    const isValid = await validateImageUrl(trustedUrl);
    if (!isValid) {
      return { success: false, error: 'Đường dẫn ảnh đã chọn không còn khả dụng.' };
    }

    // 3. Conditional database update if saving directly for an existing product
    if (productId) {
      const supabaseAdmin = createAdminClient();

      let query = supabaseAdmin
        .from('products')
        .update({
          image_url: trustedUrl,
          image_source: 'manual',
          image_status: 'valid',
          image_last_checked_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (expectedUpdatedAt) {
        query = query.eq('updated_at', expectedUpdatedAt);
      }

      if (expectedImageUrl === null) {
        query = query.is('image_url', null);
      } else if (expectedImageUrl) {
        query = query.eq('image_url', expectedImageUrl);
      }

      const { data: updated, error } = await query.select('id');

      if (error || !updated || updated.length === 0) {
        return {
          success: false,
          error: 'Sản phẩm đã bị thay đổi bởi người dùng khác. Vui lòng làm mới trang.',
        };
      }

      revalidatePath('/admin/products');
      revalidatePath(`/admin/products/${productId}`);
    }

    // 4. Mark candidate session as consumed
    await CandidateSessionService.markSessionConsumed(sessionId);

    // Note: Manual candidate selection is NEVER saved to automatic search cache
    return { success: true, url: trustedUrl };
  } catch (err: any) {
    console.error('[SelectManualCandidateAction] Error:', err);
    return { success: false, error: err.message || 'Lỗi khi chọn ảnh thủ công.' };
  }
}
