import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];
  const secretBuffer = Buffer.from(cronSecret);
  const tokenBuffer = Buffer.from(token);

  if (secretBuffer.length !== tokenBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuffer, tokenBuffer);
}

async function handleMaintenanceRequest(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing CRON_SECRET authorization token' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let retentionDays = 180;
  let batchSize = 5000;
  let isDryRun = false;

  const url = new URL(request.url);
  if (url.searchParams.has('retention')) {
    retentionDays = parseInt(url.searchParams.get('retention') || '180', 10) || 180;
  }
  if (url.searchParams.has('batch_size')) {
    batchSize = parseInt(url.searchParams.get('batch_size') || '5000', 10) || 5000;
  }
  if (url.searchParams.get('dry_run') === 'true') {
    isDryRun = true;
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json().catch(() => null);
      if (body) {
        if (typeof body.retention_days === 'number') retentionDays = body.retention_days;
        if (typeof body.batch_size === 'number') batchSize = body.batch_size;
        if (typeof body.dry_run === 'boolean') isDryRun = body.dry_run;
      }
    } catch {
      // Body parsing optional, fallback to searchParams
    }
  }

  // Validate bounds safely
  retentionDays = Math.max(30, Math.min(retentionDays, 730));
  batchSize = Math.max(100, Math.min(batchSize, 10000));

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('clean_database_maintenance', {
    p_dry_run: isDryRun,
    p_log_retention_days: retentionDays,
    p_batch_size: batchSize,
    p_trigger_type: 'cron',
  });

  if (error) {
    console.error('[DB Cleanup Cron] Execution error:', error);
    return NextResponse.json(
      { error: 'Database maintenance execution failed', details: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      status: 'success',
      mode: isDryRun ? 'dry_run_preview' : 'executed',
      data,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET(request: Request) {
  try {
    return await handleMaintenanceRequest(request);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[DB Cleanup Cron GET] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    return await handleMaintenanceRequest(request);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[DB Cleanup Cron POST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
