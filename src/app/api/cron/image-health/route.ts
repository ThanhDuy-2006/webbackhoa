import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ImageService } from '@/lib/images/image-service';
import { validateImageUrl } from '@/lib/images/image-validator';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const token = authHeader.split(' ')[1];
    
    // Validate with timingSafeEqual to prevent timing attacks
    const secretBuffer = Buffer.from(cronSecret);
    const tokenBuffer = Buffer.from(token);
    
    if (secretBuffer.length !== tokenBuffer.length || !crypto.timingSafeEqual(secretBuffer, tokenBuffer)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const supabase = createAdminClient();
    
    // Process max 20 products
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, image_url, image_source, image_retry_count, image_failed_urls')
      .in('image_status', ['unchecked', 'valid', 'invalid']) // exclude searching, needs_review
      .order('image_last_checked_at', { ascending: true, nullsFirst: true })
      .limit(20);

    if (error || !products) {
      console.error('[Image Health Cron] Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    let stats = { checked: 0, valid: 0, replaced: 0, failed: 0, skipped: 0 };

    // Process with bounded concurrency (e.g. 3)
    const CONCURRENCY = 3;
    for (let i = 0; i < products.length; i += CONCURRENCY) {
      const batch = products.slice(i, i + CONCURRENCY);
      
      await Promise.all(batch.map(async (product) => {
        stats.checked++;
        
        if (!product.image_url) {
          stats.skipped++;
          return;
        }

        const isValid = await validateImageUrl(product.image_url);
        
        if (isValid) {
          stats.valid++;
          await supabase.from('products').update({
            image_status: 'valid',
            image_last_checked_at: new Date().toISOString()
          }).eq('id', product.id);
          return;
        }

        // It is broken.
        if (product.image_source === 'manual') {
          // Do not overwrite manual images. Just mark as needs_review.
          await supabase.from('products').update({
            image_status: 'needs_review',
            image_last_checked_at: new Date().toISOString()
          }).eq('id', product.id);
          stats.failed++;
          return;
        }

        // Automatic image: Try to recover
        // Set searching first (simple locking)
        await supabase.from('products').update({ image_status: 'searching' }).eq('id', product.id);

        await ImageService.markProductAsFailed(product.id, product.image_url, product.image_retry_count + 1, product.image_failed_urls, supabase);

        // Try to generate a new one
        if (product.image_retry_count < 3) {
           const result = await ImageService.generateProductImage({
              productName: product.name,
              productId: product.id,
              bypassCache: true
           });
           
           if (result.status === 'auto_selected' && result.url) {
             stats.replaced++;
           } else {
             stats.failed++;
           }
        } else {
           stats.failed++;
        }
      }));
    }

    return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: unknown) {
    console.error('[Image Health Cron] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
