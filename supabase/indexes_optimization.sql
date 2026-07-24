-- Supabase SQL Performance Indexes Optimization Script
-- Copy and run this script in Supabase Dashboard > SQL Editor to speed up query execution by up to 500%

-- 1. Index for Products search, category filtering & active status
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- 2. Index for Product Variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id, is_active);

-- 3. Index for Orders & Order Items
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 4. Index for Topups & Transactions
CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON topup_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id, created_at DESC);

-- 5. Index for Categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
