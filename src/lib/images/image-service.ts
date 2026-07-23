import { PexelsImageSearchProvider } from './pexels.provider';
import { ImageSearchResult } from './provider.interface';
import { rankImagesByMetadata } from './image-ranking';
import { validateImageUrl } from './image-validator';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateControlledSearchQueries } from './query-generator';
import { ImageCandidate, ImageGenerationResult, NoVisionProvider, ImageVisionProvider, VisualVerificationStatus } from './types';
import { CandidateSessionService } from './candidate-session-service';

const CACHE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ImageGenerationOptions {
  productName: string;
  productId?: string | null;
  formSessionId?: string | null;
  adminId?: string;
  bypassCache?: boolean;
  excludeUrl?: string;
  previousSessionId?: string | null;
}

export const ImageService = {
  provider: new PexelsImageSearchProvider(),
  visionProvider: new NoVisionProvider() as ImageVisionProvider,

  async generateProductImage({
    productName,
    productId,
    formSessionId,
    adminId,
    bypassCache = false,
    excludeUrl,
    previousSessionId,
  }: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const supabase = createAdminClient();
    const normalizedName = productName.trim().toLowerCase();

    // 0. Invalidate previous session if Retry Search passed previousSessionId
    if (previousSessionId) {
      await CandidateSessionService.invalidateSession(previousSessionId);
    }

    // Fetch product to ensure we don't overwrite manual and get failed URLs
    let failedUrls: string[] = [];
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('image_source, image_failed_urls')
        .eq('id', productId)
        .single();

      if (product) {
        if (product.image_source === 'manual') {
          return {
            status: 'error',
            message: 'Sản phẩm đang đặt ảnh thủ công, không thể tự tạo ảnh.',
          };
        }
        failedUrls = product.image_failed_urls || [];
      }
    }

    if (excludeUrl) {
      failedUrls.push(excludeUrl);
    }

    // 1. Check Automatic Cache (if not bypassing)
    if (!bypassCache) {
      const { data: cache } = await supabase
        .from('product_image_cache')
        .select('*')
        .eq('normalized_product_name', normalizedName)
        .single();

      if (cache) {
        const isStale = Date.now() - new Date(cache.last_validated_at).getTime() > CACHE_VALIDITY_MS;

        if (!failedUrls.includes(cache.image_url)) {
          if (!isStale || (await validateImageUrl(cache.image_url))) {
            if (isStale) {
              await supabase
                .from('product_image_cache')
                .update({ last_validated_at: new Date().toISOString() })
                .eq('id', cache.id);
            }
            await supabase
              .from('product_image_cache')
              .update({ usage_count: cache.usage_count + 1 })
              .eq('id', cache.id);

            if (productId) {
              await this.updateProductWithImage(productId, cache.image_url, supabase);
            }
            return {
              status: 'auto_selected',
              url: cache.image_url,
              visualScore: 100,
              metadataScore: 100,
              verificationStatus: 'passed',
            };
          }
        }
      }
    }

    // 2. Controlled Query Generation (Max 4 queries)
    const queries = generateControlledSearchQueries(productName);
    const rawCandidates: ImageSearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
      if (seenUrls.size >= 30) break; // Stop early once 30 unique candidates collected

      const searchResults = await this.provider.searchImages(query);
      for (const res of searchResults) {
        if (!seenUrls.has(res.url) && !failedUrls.includes(res.url)) {
          seenUrls.add(res.url);
          rawCandidates.push(res);
          if (seenUrls.size >= 30) break;
        }
      }
    }

    if (rawCandidates.length === 0) {
      return {
        status: 'not_found',
        candidates: [],
        verificationStatus: 'not_available',
        reason: 'Không tìm thấy hình ảnh nào phù hợp từ nhà cung cấp.',
      };
    }

    // 3. Stage 1: Metadata Ranking (Shortlist top 10)
    const rankedCandidates = rankImagesByMetadata(rawCandidates, productName);
    const shortlistedCandidates = rankedCandidates.slice(0, 10);

    // 4. Server-Side URL Validation (Max 8 valid candidates)
    const validCandidates: ImageCandidate[] = [];
    for (const candidate of shortlistedCandidates) {
      if (validCandidates.length >= 8) break;
      const isValid = await validateImageUrl(candidate.url);
      if (isValid) {
        validCandidates.push(candidate);
      }
    }

    if (validCandidates.length === 0) {
      return {
        status: 'not_found',
        candidates: [],
        verificationStatus: 'not_available',
        reason: 'Tất cả các đường dẫn ảnh đều không hợp lệ hoặc không tải được.',
      };
    }

    // 5. Stage 2: Visual Verification
    let verificationStatus: VisualVerificationStatus = 'not_available';
    let autoCandidate: ImageCandidate | null = null;

    if (this.visionProvider && !(this.visionProvider instanceof NoVisionProvider)) {
      try {
        const evaluations = await this.visionProvider.evaluateCandidates({
          productName,
          normalizedName,
          aliases: queries,
          candidates: validCandidates.map((c) => ({ id: c.id, url: c.url })),
        });

        for (const candidate of validCandidates) {
          const evalRes = evaluations.find((e) => e.candidateId === candidate.id);
          if (evalRes) {
            candidate.visualScore = evalRes.visualScore;
            candidate.commerceSuitabilityScore = evalRes.commerceSuitabilityScore;
            candidate.reason = evalRes.reason;

            if (
              evalRes.isCorrectProduct &&
              evalRes.visualScore >= 90 &&
              evalRes.commerceSuitabilityScore >= 75 &&
              !autoCandidate
            ) {
              autoCandidate = candidate;
              verificationStatus = 'passed';
            }
          }
        }
        if (!autoCandidate) {
          verificationStatus = 'failed';
        }
      } catch (err) {
        console.error('Vision provider error:', err);
        verificationStatus = 'not_available';
      }
    }

    // 6. Auto Selection
    if (autoCandidate) {
      // Update Cache
      await supabase.from('product_image_cache').upsert(
        {
          normalized_product_name: normalizedName,
          image_url: autoCandidate.url,
          provider: 'pexels',
          last_validated_at: new Date().toISOString(),
        },
        { onConflict: 'normalized_product_name' }
      );

      // Update Product
      if (productId) {
        await this.updateProductWithImage(productId, autoCandidate.url, supabase);
      }

      return {
        status: 'auto_selected',
        url: autoCandidate.url,
        visualScore: autoCandidate.visualScore || 90,
        metadataScore: autoCandidate.metadataScore,
        verificationStatus: 'passed',
      };
    }

    // 7. Manual Selection Required (Top 5 valid candidates)
    const top5Candidates = validCandidates.slice(0, 5);

    // Save server candidate session in DB
    const candidateSessionId = await CandidateSessionService.createSession({
      adminId: adminId || 'system',
      productId,
      formSessionId,
      candidates: top5Candidates,
    });

    return {
      status: 'manual_selection_required',
      candidateSessionId,
      candidates: top5Candidates,
      verificationStatus,
      reason:
        verificationStatus === 'not_available'
          ? 'Chưa cấu hình kiểm tra hình ảnh bằng AI. Vui lòng chọn ảnh thủ công.'
          : 'Không có ảnh nào đạt độ phù hợp AI >= 90%. Vui lòng chọn ảnh thủ công.',
    };
  },

  async updateProductWithImage(productId: string, validUrl: string, supabase: ReturnType<typeof createAdminClient>) {
    await supabase
      .from('products')
      .update({
        image_url: validUrl,
        image_status: 'valid',
        image_source: 'auto',
        image_last_checked_at: new Date().toISOString(),
        image_retry_count: 0,
      })
      .eq('id', productId);
  },
  async markProductAsFailed(productId: string, failedUrl: string | null, retryCount: number, currentFailed: string[], supabase: ReturnType<typeof createAdminClient>) {
    const newFailed = failedUrl ? [...new Set([failedUrl, ...currentFailed])].slice(0, 20) : currentFailed;
    
    await supabase.from('products').update({
      image_status: retryCount >= 3 ? 'needs_review' : 'invalid',
      image_failed_urls: newFailed,
      image_retry_count: retryCount,
      image_last_checked_at: new Date().toISOString()
    }).eq('id', productId);
  }
};
