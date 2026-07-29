-- Migration: Proposed Partial Indexes for Storefront Query Performance Optimization

-- 1. Proposed Storefront Products Index (ordered by created_at DESC for newest filtering)
CREATE INDEX IF NOT EXISTS idx_products_storefront_created_at
ON public.products (created_at DESC)
WHERE deleted_at IS NULL AND is_active = true;

-- 2. Proposed Storefront Products Category Filtering Index
CREATE INDEX IF NOT EXISTS idx_products_storefront_category_created_at
ON public.products (category_id, created_at DESC)
WHERE deleted_at IS NULL AND is_active = true;

-- 3. Proposed Storefront Categories Navigation Index
CREATE INDEX IF NOT EXISTS idx_categories_storefront_created_at
ON public.categories (created_at DESC)
WHERE is_deleted = false AND is_active = true;
