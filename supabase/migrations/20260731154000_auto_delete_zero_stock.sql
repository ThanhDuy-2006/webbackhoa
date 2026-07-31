-- Automatically mark product as deleted when stock reaches 0

CREATE OR REPLACE FUNCTION public.trg_auto_delete_zero_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Set deleted_at to current timestamp if stock is 0 or less
  IF NEW.stock <= 0 THEN
    NEW.deleted_at := now();
    NEW.listing_status := 'deleted';
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_delete_zero_stock ON public.products;
CREATE TRIGGER trigger_auto_delete_zero_stock
BEFORE UPDATE ON public.products
FOR EACH ROW
WHEN (NEW.stock <= 0 AND OLD.stock > 0 AND NEW.listing_status != 'deleted')
EXECUTE FUNCTION public.trg_auto_delete_zero_stock();

-- Immediately delete any existing active products with 0 stock
UPDATE public.products 
SET deleted_at = now(), listing_status = 'deleted', is_active = false 
WHERE stock <= 0 AND listing_status != 'deleted';
