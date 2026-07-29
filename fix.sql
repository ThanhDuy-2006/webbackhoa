CREATE OR REPLACE FUNCTION public.atomic_c2c_checkout(
  p_idempotency_key UUID,
  p_request_hash TEXT,
  p_items JSONB,
  p_receiver_name TEXT,
  p_receiver_phone TEXT,
  p_receiver_address TEXT,
  p_note TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_buyer_id UUID;
  v_existing_order_id UUID;
  v_existing_hash TEXT;
  v_fee_bps INTEGER;
  v_buyer_balance NUMERIC;
  v_buyer_blocked BOOLEAN;
  v_total_amount NUMERIC := 0;
  v_order_code TEXT;
  v_parent_order_id UUID;
  v_product_price NUMERIC;
  v_product_sale_price NUMERIC;
  v_product_name TEXT;
  v_seller_id UUID;
  v_product_source TEXT;
  v_product_stock INTEGER;
  v_listing_status TEXT;
  v_is_active BOOLEAN;
  v_deleted_at TIMESTAMPTZ;
  v_variant_price NUMERIC;
  v_variant_stock INTEGER;
  v_authoritative_price NUMERIC;
  v_current_stock INTEGER;
  v_item_subtotal NUMERIC;
  v_item_fee NUMERIC;
  v_item_seller_amount NUMERIC;
  v_seller_record RECORD;
  v_seller_order_id UUID;
  v_prev_pending NUMERIC;
  v_item_record RECORD;
BEGIN
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Vui lÃ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ thanh toÃ¡n';
  END IF;

  -- 1. Idempotency Check
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'MÃ£ chá»‘ng trÃ¹ng láº·p (idempotency_key) lÃ  báº¯t buá»™c';
  END IF;

  SELECT id, request_hash INTO v_existing_order_id, v_existing_hash
  FROM public.orders
  WHERE user_id = v_buyer_id AND idempotency_key = p_idempotency_key;

  IF v_existing_order_id IS NOT NULL THEN
    IF v_existing_hash <> p_request_hash THEN
      RAISE EXCEPTION 'Idempotency key Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng vá»›i payload khÃ¡c';
    END IF;
    RETURN v_existing_order_id;
  END IF;

  -- 2. Lock & Validate Buyer Profile/Wallet
  SELECT balance, is_blocked INTO v_buyer_balance, v_buyer_blocked
  FROM public.profiles
  WHERE id = v_buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TÃ i khoáº£n ngÆ°á»i mua khÃ´ng tá»“n táº¡i';
  END IF;

  IF v_buyer_blocked THEN
    RAISE EXCEPTION 'TÃ i khoáº£n ngÆ°á»i mua Ä‘ang bá»‹ khÃ³a';
  END IF;

  -- 2. Check global fee configuration (hardcoded to 3% for now)
  v_fee_bps := 300;

  -- 4. Aggregate & Validate Items
  CREATE TEMP TABLE tmp_cart_items ON COMMIT DROP AS
  SELECT 
    (elem->>'product_id')::UUID as product_id,
    CASE WHEN (elem->>'variant_id') IS NOT NULL AND (elem->>'variant_id') <> '' THEN (elem->>'variant_id')::UUID ELSE NULL END as variant_id,
    SUM((elem->>'quantity')::INTEGER)::INTEGER as quantity
  FROM jsonb_array_elements(p_items) elem
  GROUP BY 1, 2;

  FOR v_item_record IN SELECT * FROM tmp_cart_items ORDER BY product_id, variant_id
  LOOP
    IF v_item_record.quantity <= 0 THEN
      RAISE EXCEPTION 'Sá»‘ lÆ°á»£ng sáº£n pháº©m khÃ´ng há»£p lá»‡';
    END IF;

    -- Lock product row
    SELECT name, price, sale_price, stock, seller_id, product_source, listing_status, is_active, deleted_at
    INTO v_product_name, v_product_price, v_product_sale_price, v_product_stock, v_seller_id, v_product_source, v_listing_status, v_is_active, v_deleted_at
    FROM public.products
    WHERE id = v_item_record.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sáº£n pháº©m % khÃ´ng tá»“n táº¡i', v_item_record.product_id;
    END IF;

    -- Reject self-purchase
    IF v_seller_id = v_buyer_id THEN
      RAISE EXCEPTION 'Báº¡n khÃ´ng thá»ƒ tá»± mua sáº£n pháº©m do chÃ­nh mÃ¬nh Ä‘Äƒng bÃ¡n (%)', v_product_name;
    END IF;

    -- Validate listing active state
    IF v_listing_status <> 'active' OR NOT v_is_active OR v_deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Sáº£n pháº©m "%" hiá»‡n khÃ´ng cÃ²n má»Ÿ bÃ¡n', v_product_name;
    END IF;

    -- Handle variant price and stock if specified
    IF v_item_record.variant_id IS NOT NULL THEN
      SELECT price, stock INTO v_variant_price, v_variant_stock
      FROM public.product_variants
      WHERE id = v_item_record.variant_id AND product_id = v_item_record.product_id AND is_active = true
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Biáº¿n thá»ƒ sáº£n pháº©m khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ ngá»«ng bÃ¡n';
      END IF;

      v_authoritative_price := COALESCE(v_variant_price, v_product_sale_price, v_product_price);
      v_current_stock := v_variant_stock;
    ELSE
      v_authoritative_price := COALESCE(v_product_sale_price, v_product_price);
      v_current_stock := v_product_stock;
    END IF;

    IF v_authoritative_price IS NULL THEN
      RAISE EXCEPTION 'KhÃ´ng thá»ƒ xÃ¡c Ä‘á»‹nh giÃ¡ sáº£n pháº©m "%"', v_product_name;
    END IF;

    -- Check stock
    IF v_current_stock < v_item_record.quantity THEN
      RAISE EXCEPTION 'Sáº£n pháº©m "%" chá»‰ cÃ²n % sáº£n pháº©m trong kho', v_product_name, v_current_stock;
    END IF;

    v_item_subtotal := v_authoritative_price * v_item_record.quantity;
    v_total_amount := v_total_amount + v_item_subtotal;
  END LOOP;

  -- 5. Check Buyer Wallet Balance
  IF v_buyer_balance < v_total_amount THEN
    RAISE EXCEPTION 'Sá»‘ dÆ° vÃ­ khÃ´ng Ä‘á»§. Cáº§n %Ä‘ nhÆ°ng sá»‘ dÆ° hiá»‡n táº¡i lÃ  %Ä‘', v_total_amount, v_buyer_balance;
  END IF;

  -- 6. Generate Order Code & Create Parent Order
  v_order_code := 'ORD-' || FLOOR(EXTRACT(EPOCH FROM now()))::TEXT || '-' || FLOOR(RANDOM() * 8999 + 1000)::TEXT;

  BEGIN
    INSERT INTO public.orders (
      user_id, order_code, total_amount, discount_amount, final_amount,
      status, payment_status, payment_method, receiver_name, receiver_phone, receiver_address, note,
      idempotency_key, request_hash
    )
    VALUES (
      v_buyer_id, v_order_code, v_total_amount, 0, v_total_amount,
      'completed', 'paid', 'wallet', p_receiver_name, p_receiver_phone, p_receiver_address, p_note,
      p_idempotency_key, p_request_hash
    )
    RETURNING id INTO v_parent_order_id;
  EXCEPTION WHEN unique_violation THEN
    -- Concurrency fallback
    SELECT id INTO v_parent_order_id FROM public.orders WHERE user_id = v_buyer_id AND idempotency_key = p_idempotency_key;
    IF v_parent_order_id IS NOT NULL THEN
      RETURN v_parent_order_id;
    END IF;
    RAISE EXCEPTION 'Lá»—i há»‡ thá»‘ng khi táº¡o Ä‘Æ¡n hÃ ng, vui lÃ²ng thá»­ láº¡i';
  END;

  -- 7. Debit Buyer Wallet & Record Wallet Transaction
  UPDATE public.profiles
  SET balance = balance - v_total_amount
  WHERE id = v_buyer_id;

  INSERT INTO public.wallet_transactions (
    user_id, amount, type, note, balance_before, balance_after, related_order_id
  )
  VALUES (
    v_buyer_id, -v_total_amount, 'payment', 'Thanh toÃ¡n Ä‘Æ¡n hÃ ng #' || v_order_code, v_buyer_balance, v_buyer_balance - v_total_amount, v_parent_order_id
  );

  -- 8. Group Items by Seller & Create Seller Orders + Order Items + Stock Decrement
  -- Need to use the raw payload again to match frontend order_items rows, but using authoritative price logic
  FOR v_item_record IN SELECT * FROM tmp_cart_items ORDER BY product_id, variant_id
  LOOP
    SELECT name, price, sale_price, seller_id
    INTO v_product_name, v_product_price, v_product_sale_price, v_seller_id
    FROM public.products WHERE id = v_item_record.product_id;

    IF v_item_record.variant_id IS NOT NULL THEN
      SELECT price INTO v_variant_price
      FROM public.product_variants WHERE id = v_item_record.variant_id;
      v_authoritative_price := COALESCE(v_variant_price, v_product_sale_price, v_product_price);
    ELSE
      v_authoritative_price := COALESCE(v_product_sale_price, v_product_price);
    END IF;

    v_item_subtotal := v_authoritative_price * v_item_record.quantity;
    v_item_fee := FLOOR(v_item_subtotal * v_fee_bps / 10000.0);
    v_item_seller_amount := v_item_subtotal - v_item_fee;

    -- Decrement stock
    IF v_item_record.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock - v_item_record.quantity WHERE id = v_item_record.variant_id;
    ELSE
      UPDATE public.products SET stock = stock - v_item_record.quantity WHERE id = v_item_record.product_id;
    END IF;

    -- Insert order item snapshot
    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_price, quantity, subtotal,
      seller_id, unit_price, platform_fee_bps, platform_fee, seller_amount, seller_payment_status
    )
    VALUES (
      v_parent_order_id, v_item_record.product_id, v_product_name, v_product_price, v_item_record.quantity, v_item_subtotal,
      v_seller_id, v_authoritative_price, v_fee_bps, v_item_fee, v_item_seller_amount, 'completed'
    );
  END LOOP;

  -- 9. Create Seller Orders for each Seller & Credit Pending Balance
  FOR v_seller_record IN 
    SELECT seller_id, SUM(subtotal) as seller_subtotal, SUM(platform_fee) as seller_fee, SUM(seller_amount) as seller_earnings
    FROM public.order_items
    WHERE order_id = v_parent_order_id AND seller_id IS NOT NULL
    GROUP BY seller_id
  LOOP
    INSERT INTO public.seller_orders (
      parent_order_id, seller_id, buyer_id, subtotal, platform_fee_bps, platform_fee, seller_earnings, status, payment_status
    )
    VALUES (
      v_parent_order_id, v_seller_record.seller_id, v_buyer_id,
      v_seller_record.seller_subtotal, v_fee_bps, v_seller_record.seller_fee, v_seller_record.seller_earnings,
      'completed', 'paid'
    )
    RETURNING id INTO v_seller_order_id;

    -- Link items to seller_order_id
    UPDATE public.order_items
    SET seller_order_id = v_seller_order_id
    WHERE order_id = v_parent_order_id AND seller_id = v_seller_record.seller_id;

    -- Init seller_wallet if not exists
    INSERT INTO public.seller_wallets (seller_id, pending_balance, available_balance, reserved_balance, withdrawn_balance)
    VALUES (v_seller_record.seller_id, 0, 0, 0, 0)
    ON CONFLICT (seller_id) DO NOTHING;

    -- Lock seller wallet & credit available balance directly (skipping escrow)
    SELECT available_balance INTO v_prev_pending
    FROM public.seller_wallets
    WHERE seller_id = v_seller_record.seller_id
    FOR UPDATE;

    UPDATE public.seller_wallets
    SET available_balance = available_balance + v_seller_record.seller_earnings,
        updated_at = now()
    WHERE seller_id = v_seller_record.seller_id;

    -- Record immutable ledger transaction
    INSERT INTO public.seller_ledger_transactions (
      seller_id, seller_order_id, type, amount, platform_fee, balance_before, balance_after, description
    )
    VALUES (
      v_seller_record.seller_id, v_seller_order_id, 'sale_completed', v_seller_record.seller_earnings, v_seller_record.seller_fee,
      v_prev_pending, v_prev_pending + v_seller_record.seller_earnings, 'Doanh thu Ä‘Æ¡n bÃ¡n #' || v_order_code
    );
  END LOOP;

  -- 10. Clear Buyer Cart
  DELETE FROM public.carts WHERE user_id = v_buyer_id;

  RETURN v_parent_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.atomic_c2c_checkout FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atomic_c2c_checkout TO authenticated;

