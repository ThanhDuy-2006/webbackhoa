'use server'

import { ImageService } from '@/lib/images/image-service'
import { CandidateSessionService } from '@/lib/images/candidate-session-service'
import { validateImageUrl } from '@/lib/images/image-validator'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'

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

import { DANH_SACH_SAN_PHAM_CSV } from '@/lib/images/danhsachsanpham';

let localImageCache: Map<string, string> | null = null;

async function getLocalImageMap() {
  if (localImageCache) return localImageCache;
  localImageCache = new Map();
  try {
    const lines = DANH_SACH_SAN_PHAM_CSV.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const lastComma = line.lastIndexOf(',');
      if (lastComma !== -1) {
        const url = line.substring(lastComma + 1).trim();
        let name = line.substring(0, lastComma).trim();
        if (name.startsWith('"') && name.endsWith('"')) {
          name = name.substring(1, name.length - 1).trim();
        }
        if (name && url) {
          localImageCache.set(name.toLowerCase(), url);
        }
      }
    }
  } catch (err) {
    console.error('Could not parse danhsachsanpham.csv', err);
  }
  return localImageCache;
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

    const localMap = await getLocalImageMap();
    const searchName = productName.toLowerCase().trim();
    if (localMap) {
      let matchedUrl: string | null = null;
      
      if (localMap.has(searchName)) {
        matchedUrl = localMap.get(searchName)!;
      } else {
        const keys = Array.from(localMap.keys()).sort((a, b) => b.length - a.length);
        for (const key of keys) {
          if (searchName.includes(key) || key.includes(searchName)) {
            matchedUrl = localMap.get(key)!;
            break;
          }
        }
      }

      if (matchedUrl) {
        if (productId) {
          const supabaseAdmin = createAdminClient();
          await supabaseAdmin
            .from('products')
            .update({
              image_url: matchedUrl,
              image_source: 'auto',
              image_status: 'valid',
              images: [matchedUrl]
            })
            .eq('id', productId);
        }
        
        return { 
          status: 'auto_selected' as const,
          url: matchedUrl,
          candidates: []
        };
      }
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
      revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max')
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

    const { url: trustedUrl, sessionId } = await CandidateSessionService.verifyAndResolveCandidate({
      candidateSessionId,
      candidateId,
      adminId,
      productId,
      formSessionId,
    });

    const isValid = await validateImageUrl(trustedUrl);
    if (!isValid) {
      return { success: false, error: 'Đường dẫn ảnh đã chọn không còn khả dụng.' };
    }

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

      let { data: updated, error } = await query.select('id');

      if (error || !updated || updated.length === 0) {
        // Fallback: Retry update by product ID directly
        const { data: retryUpdate, error: retryError } = await supabaseAdmin
          .from('products')
          .update({
            image_url: trustedUrl,
            image_source: 'manual',
            image_status: 'valid',
            image_last_checked_at: new Date().toISOString(),
          })
          .eq('id', productId)
          .select('id');

        if (retryError || !retryUpdate || retryUpdate.length === 0) {
          return {
            success: false,
            error: 'Không thể cập nhật ảnh do sản phẩm không còn tồn tại.',
          };
        }
      }

      revalidatePath('/admin/products');
      revalidatePath(`/admin/products/${productId}`);
      revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max')
    }

    await CandidateSessionService.markSessionConsumed(sessionId);

    return { success: true, url: trustedUrl };
  } catch (err: any) {
    console.error('[SelectManualCandidateAction] Error:', err);
    return { success: false, error: err.message || 'Lỗi khi chọn ảnh thủ công.' };
  }
}
