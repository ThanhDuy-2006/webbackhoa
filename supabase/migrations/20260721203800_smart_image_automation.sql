-- Migration: Smart Product Image Automation

-- Add tracking fields to products
ALTER TABLE public.products
ADD COLUMN image_source text not null default 'auto' check (image_source in ('auto', 'manual')),
ADD COLUMN image_status text not null default 'unchecked' check (image_status in ('unchecked', 'searching', 'valid', 'invalid', 'needs_review')),
ADD COLUMN image_last_checked_at timestamptz null,
ADD COLUMN image_retry_count integer not null default 0 check (image_retry_count >= 0),
ADD COLUMN image_failed_urls jsonb not null default '[]'::jsonb;

-- Create compound index for the cron query (filtering by status and source, sorting by last_checked_at)
CREATE INDEX idx_products_image_cron ON public.products(image_status, image_source, image_last_checked_at);

-- Create cache table
CREATE TABLE public.product_image_cache (
    id uuid primary key default gen_random_uuid(),
    normalized_product_name text not null unique,
    image_url text not null,
    provider text not null,
    created_at timestamptz not null default now(),
    last_validated_at timestamptz null,
    usage_count integer not null default 0
);

-- Enable RLS on cache table
ALTER TABLE public.product_image_cache ENABLE ROW LEVEL SECURITY;

-- Allow only authenticated admins to modify the cache
CREATE POLICY "Only authenticated admins can manage product image cache" ON public.product_image_cache
    FOR ALL
    TO authenticated
    USING ( (auth.jwt() ->> 'role' = 'admin') OR (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')) );

-- Create an index on normalized_product_name for fast lookups
CREATE INDEX idx_product_image_cache_normalized_name ON public.product_image_cache (normalized_product_name);
