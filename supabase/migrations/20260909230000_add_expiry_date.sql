-- Add expiry_date column to products table for FIFO / expiration tracking
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;

-- Add index for fast querying of expiring products
CREATE INDEX IF NOT EXISTS idx_products_expiry_date 
ON public.products (expiry_date);
