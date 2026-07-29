import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ImageService } from '@/lib/images/image-service';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';

const rateLimitMap = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const now = Date.now();
    const lastReport = rateLimitMap.get(productId);
    if (lastReport && (now - lastReport < 60 * 60 * 1000)) {
      return NextResponse.json({ success: true, message: 'Already reported recently' });
    }
    rateLimitMap.set(productId, now);
    
    if (rateLimitMap.size > 10000) {
       rateLimitMap.clear();
    }

    const supabase = createAdminClient();
    
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, image_url, image_source, image_retry_count, image_failed_urls, image_last_checked_at')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.image_source === 'manual') {
      await supabase.from('products').update({
        image_status: 'needs_review',
        image_last_checked_at: new Date().toISOString()
      }).eq('id', product.id);
      return NextResponse.json({ success: true, status: 'manual_flagged' });
    }

    const lastChecked = product.image_last_checked_at ? new Date(product.image_last_checked_at).getTime() : 0;
    if (now - lastChecked < 6 * 60 * 60 * 1000 && product.image_retry_count > 0) {
      return NextResponse.json({ success: true, status: 'cooldown' });
    }

    const originalImageUrl = product.image_url;
    const originalRetryCount = product.image_retry_count;

    let updateQuery = supabase
      .from('products')
      .update({ image_status: 'searching' })
      .eq('id', product.id)
      .eq('image_source', 'auto')
      .eq('image_retry_count', originalRetryCount);

    if (originalImageUrl === null) {
      updateQuery = updateQuery.is('image_url', null);
    } else {
      updateQuery = updateQuery.eq('image_url', originalImageUrl);
    }

    const { data: updatedProduct, error: updateError } = await updateQuery.select('id').maybeSingle();

    if (updateError || !updatedProduct) {
      return NextResponse.json({ success: true, status: 'stale' });
    }

    await ImageService.markProductAsFailed(product.id, originalImageUrl, originalRetryCount + 1, product.image_failed_urls || [], supabase);

    if (originalRetryCount < 3) {
      const res = await ImageService.generateProductImage({
         productName: product.name,
         productId: product.id,
         bypassCache: true
      });
      if (res.status === 'auto_selected') {
        revalidateTag(CACHE_TAGS.STOREFRONT_PRODUCTS, 'max');
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Report Broken Image] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
