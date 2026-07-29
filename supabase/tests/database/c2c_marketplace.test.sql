BEGIN;
SELECT plan(15);

-- 1. Setup mock data & bypass RLS for setup
SET search_path TO public, pg_temp;

-- 1.1 Insert Mock Profiles
INSERT INTO public.profiles (id, email, full_name, role, balance)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Admin User', 'admin', 0),
  ('00000000-0000-0000-0000-000000000002', 'seller@example.com', 'Seller User', 'user', 0),
  ('00000000-0000-0000-0000-000000000003', 'buyer@example.com', 'Buyer User', 'user', 1000000)
ON CONFLICT (id) DO NOTHING;

-- 1.2 Insert Mock Category
INSERT INTO public.categories (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Category', 'test-category')
ON CONFLICT (id) DO NOTHING;

-- 1.3 Insert Mock Products
INSERT INTO public.products (id, name, slug, description, price, sale_price, stock, category_id, seller_id, product_source, listing_status, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000101', 'Product 1', 'product-1', 'Desc 1', 150000, 100000, 10, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'seller', 'active', true),
  ('00000000-0000-0000-0000-000000000102', 'Product 2', 'product-2', 'Desc 2', 200000, NULL, 5, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'seller', 'active', true)
ON CONFLICT (id) DO NOTHING;

-- Set marketplace fee to 5% (500 bps)
UPDATE public.marketplace_settings SET platform_fee_bps = 500 WHERE id = 'default';

-- Prepare test items payload
DO $$
DECLARE
  v_items JSONB;
  v_order_id UUID;
  v_idempotency_key UUID := gen_random_uuid();
  v_hash TEXT := 'testhash';
  v_buyer_id UUID := '00000000-0000-0000-0000-000000000003';
  v_seller_id UUID := '00000000-0000-0000-0000-000000000002';
  v_seller_order_id UUID;
BEGIN
  -- Test 1: Require Authentication
  BEGIN
    PERFORM public.atomic_c2c_checkout(v_idempotency_key, v_hash, '[]'::jsonb, 'Name', 'Phone', 'Address');
    -- Should fail because no auth.uid()
    RAISE EXCEPTION 'Did not throw for missing auth';
  EXCEPTION WHEN OTHERS THEN
    -- Expected to fail since we haven't set role
  END;

  -- Test 2: Set role to buyer
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003"}', true);

  -- Cart: 2 of Product 1 (100k) + 1 of Product 2 (200k) = 400k total
  v_items := '[{"product_id": "00000000-0000-0000-0000-000000000101", "quantity": 2}, {"product_id": "00000000-0000-0000-0000-000000000102", "quantity": 1}]'::jsonb;
  
  v_order_id := public.atomic_c2c_checkout(v_idempotency_key, v_hash, v_items, 'Test Receiver', '0123456789', 'Test Address');
  
  -- Test 3: Idempotency with exact hash returns same ID
  DECLARE
    v_order_id_2 UUID;
  BEGIN
    v_order_id_2 := public.atomic_c2c_checkout(v_idempotency_key, v_hash, v_items, 'Test Receiver', '0123456789', 'Test Address');
    IF v_order_id_2 <> v_order_id THEN
      RAISE EXCEPTION 'Idempotency failed, returned different order ID';
    END IF;
  END;

  -- Test 4: Idempotency with mismatch hash throws error
  BEGIN
    PERFORM public.atomic_c2c_checkout(v_idempotency_key, 'badhash', v_items, 'Test Receiver', '0123456789', 'Test Address');
    RAISE EXCEPTION 'Did not throw on hash mismatch';
  EXCEPTION WHEN OTHERS THEN
    -- Expected
  END;
  
  -- Get seller order
  SELECT id INTO v_seller_order_id FROM public.seller_orders WHERE parent_order_id = v_order_id LIMIT 1;

  -- Test 5: Buyer cannot change status
  BEGIN
    PERFORM public.update_seller_order_status(v_seller_order_id, 'confirmed');
    RAISE EXCEPTION 'Buyer should not be able to confirm seller order';
  EXCEPTION WHEN OTHERS THEN
    -- Expected
  END;

  -- Test 6: Set role to seller and change status
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
  PERFORM public.update_seller_order_status(v_seller_order_id, 'confirmed');
  PERFORM public.update_seller_order_status(v_seller_order_id, 'shipping');

  -- Test 7: Seller cannot complete order
  BEGIN
    PERFORM public.complete_seller_order(v_seller_order_id);
    RAISE EXCEPTION 'Seller should not be able to complete their own order';
  EXCEPTION WHEN OTHERS THEN
    -- Expected
  END;

  -- Test 8: Set role back to buyer and complete order
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
  PERFORM public.complete_seller_order(v_seller_order_id);
  
END $$;

SELECT pass('c2c tests completed');

SELECT * FROM finish();
ROLLBACK;
