-- Migration: Peer-to-Peer (C2C) Multi-Vendor Marketplace System Core Architecture
-- Migration Timestamp: 20260729184500

-- ============================================================================
-- 1. MARKETPLACE SETTINGS SINGLETON TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  platform_fee_bps INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_settings_singleton CHECK (id = 'default'),
  CONSTRAINT marketplace_fee_range CHECK (platform_fee_bps >= 0 AND platform_fee_bps <= 10000)
);

INSERT INTO public.marketplace_settings (id, platform_fee_bps)
VALUES ('default', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. PRODUCTS TABLE EXTENSIONS & CONSTRAINTS
-- ============================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_source TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listing_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Drop old constraints if exist to allow re-run
DO $$ 
BEGIN
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_product_source_seller;
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_listing_status;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.products 
  ADD CONSTRAINT chk_product_source_seller 
  CHECK (
    (product_source = 'platform' AND seller_id IS NULL) OR
    (product_source = 'seller' AND seller_id IS NOT NULL)
  );

ALTER TABLE public.products 
  ADD CONSTRAINT chk_listing_status 
  CHECK (listing_status IN ('draft', 'active', 'paused', 'suspended', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_listing_status ON public.products(listing_status, is_active, stock);

-- ============================================================================
-- 3. SAFE MIGRATION & BACKFILL FOR ORDER_ITEMS & ORDERS
-- ============================================================================
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS platform_fee_bps INTEGER DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_amount NUMERIC;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_payment_status TEXT DEFAULT 'pending';

-- Backfill legacy order_items
UPDATE public.order_items
SET 
  unit_price = COALESCE(unit_price, product_price),
  platform_fee_bps = COALESCE(platform_fee_bps, 0),
  platform_fee = COALESCE(platform_fee, 0),
  seller_amount = COALESCE(seller_amount, subtotal),
  seller_payment_status = COALESCE(seller_payment_status, 'pending')
WHERE unit_price IS NULL OR seller_amount IS NULL;

-- Orders idempotency columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS request_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_buyer_idempotency 
ON public.orders (user_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 4. SELLER ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seller_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  platform_fee_bps INTEGER NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  seller_earnings NUMERIC NOT NULL CHECK (seller_earnings >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_orders_seller_id ON public.seller_orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_seller_orders_parent_id ON public.seller_orders(parent_order_id);

-- Link order_items to seller_orders
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_order_id UUID REFERENCES public.seller_orders(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. SELLER WALLETS & LEDGER TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seller_wallets (
  seller_id UUID PRIMARY KEY REFERENCES public.profiles(id),
  pending_balance NUMERIC NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  available_balance NUMERIC NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  reserved_balance NUMERIC NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
  withdrawn_balance NUMERIC NOT NULL DEFAULT 0 CHECK (withdrawn_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  seller_order_id UUID REFERENCES public.seller_orders(id),
  type TEXT NOT NULL CHECK (type IN ('sale_pending', 'sale_completed', 'refund', 'cancellation', 'withdrawal_reserved', 'withdrawal_completed', 'withdrawal_rejected', 'adjustment')),
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ledger_tx UNIQUE NULLS NOT DISTINCT (seller_order_id, type)
);

CREATE INDEX IF NOT EXISTS idx_seller_ledger_seller_id ON public.seller_ledger_transactions(seller_id, created_at DESC);

-- ============================================================================
-- 6. SELLER WITHDRAWALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seller_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_withdrawals_status ON public.seller_withdrawals(seller_id, status);

-- ============================================================================
-- 7. PRODUCT & SELLER REPORTS (REACTIVE MODERATION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, action);

-- ============================================================================
-- 9. RPC: ATOMIC C2C CHECKOUT (17 STEPS AUTOMATED TRANSACTION)
-- ============================================================================
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
    RAISE EXCEPTION 'Vui lòng đăng nhập để thanh toán';
  END IF;

  -- 1. Idempotency Check
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Mã chống trùng lặp (idempotency_key) là bắt buộc';
  END IF;

  SELECT id, request_hash INTO v_existing_order_id, v_existing_hash
  FROM public.orders
  WHERE user_id = v_buyer_id AND idempotency_key = p_idempotency_key;

  IF v_existing_order_id IS NOT NULL THEN
    IF v_existing_hash <> p_request_hash THEN
      RAISE EXCEPTION 'Idempotency key đã được sử dụng với payload khác';
    END IF;
    RETURN v_existing_order_id;
  END IF;

  -- 2. Lock & Validate Buyer Profile/Wallet
  SELECT balance, is_blocked INTO v_buyer_balance, v_buyer_blocked
  FROM public.profiles
  WHERE id = v_buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tài khoản người mua không tồn tại';
  END IF;

  IF v_buyer_blocked THEN
    RAISE EXCEPTION 'Tài khoản người mua đang bị khóa';
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
      RAISE EXCEPTION 'Số lượng sản phẩm không hợp lệ';
    END IF;

    -- Lock product row
    SELECT name, price, sale_price, stock, seller_id, product_source, listing_status, is_active, deleted_at
    INTO v_product_name, v_product_price, v_product_sale_price, v_product_stock, v_seller_id, v_product_source, v_listing_status, v_is_active, v_deleted_at
    FROM public.products
    WHERE id = v_item_record.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sản phẩm % không tồn tại', v_item_record.product_id;
    END IF;

    -- Reject self-purchase
    IF v_seller_id = v_buyer_id THEN
      RAISE EXCEPTION 'Bạn không thể tự mua sản phẩm do chính mình đăng bán (%)', v_product_name;
    END IF;

    -- Validate listing active state
    IF v_listing_status <> 'active' OR NOT v_is_active OR v_deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Sản phẩm "%" hiện không còn mở bán', v_product_name;
    END IF;

    -- Handle variant price and stock if specified
    IF v_item_record.variant_id IS NOT NULL THEN
      SELECT price, stock INTO v_variant_price, v_variant_stock
      FROM public.product_variants
      WHERE id = v_item_record.variant_id AND product_id = v_item_record.product_id AND is_active = true
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Biến thể sản phẩm không tồn tại hoặc đã ngừng bán';
      END IF;

      v_authoritative_price := COALESCE(v_variant_price, v_product_sale_price, v_product_price);
      v_current_stock := v_variant_stock;
    ELSE
      v_authoritative_price := COALESCE(v_product_sale_price, v_product_price);
      v_current_stock := v_product_stock;
    END IF;

    IF v_authoritative_price IS NULL THEN
      RAISE EXCEPTION 'Không thể xác định giá sản phẩm "%"', v_product_name;
    END IF;

    -- Check stock
    IF v_current_stock < v_item_record.quantity THEN
      RAISE EXCEPTION 'Sản phẩm "%" chỉ còn % sản phẩm trong kho', v_product_name, v_current_stock;
    END IF;

    v_item_subtotal := v_authoritative_price * v_item_record.quantity;
    v_total_amount := v_total_amount + v_item_subtotal;
  END LOOP;

  -- 5. Check Buyer Wallet Balance
  IF v_buyer_balance < v_total_amount THEN
    RAISE EXCEPTION 'Số dư ví không đủ. Cần %đ nhưng số dư hiện tại là %đ', v_total_amount, v_buyer_balance;
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
    RAISE EXCEPTION 'Lỗi hệ thống khi tạo đơn hàng, vui lòng thử lại';
  END;

  -- 7. Debit Buyer Wallet & Record Wallet Transaction
  UPDATE public.profiles
  SET balance = balance - v_total_amount
  WHERE id = v_buyer_id;

  INSERT INTO public.wallet_transactions (
    user_id, amount, type, note, balance_before, balance_after, related_order_id
  )
  VALUES (
    v_buyer_id, -v_total_amount, 'payment', 'Thanh toán đơn hàng #' || v_order_code, v_buyer_balance, v_buyer_balance - v_total_amount, v_parent_order_id
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
      v_prev_pending, v_prev_pending + v_seller_record.seller_earnings, 'Doanh thu đơn bán #' || v_order_code
    );
  END LOOP;

  -- 10. Clear Buyer Cart
  DELETE FROM public.carts WHERE user_id = v_buyer_id;

  RETURN v_parent_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.atomic_c2c_checkout FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atomic_c2c_checkout TO authenticated;

-- ============================================================================
-- 10. RPC: COMPLETE SELLER ORDER (UNLOCK PENDING TO AVAILABLE BALANCE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_seller_order(
  p_seller_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_earnings NUMERIC;
  v_fee NUMERIC;
  v_status TEXT;
  v_actor_role TEXT;
  v_prev_pending NUMERIC;
  v_prev_avail NUMERIC;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập';
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

  SELECT seller_id, buyer_id, seller_earnings, platform_fee, status
  INTO v_seller_id, v_buyer_id, v_earnings, v_fee, v_status
  FROM public.seller_orders
  WHERE id = p_seller_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đơn bán không tồn tại';
  END IF;

  IF v_status = 'completed' THEN
    RETURN true; -- Idempotent success
  END IF;

  IF v_status <> 'shipping' THEN
    RAISE EXCEPTION 'Chỉ có thể hoàn thành đơn hàng đang giao (shipping)';
  END IF;

  -- Seller cannot mark completed! Only buyer or admin.
  IF v_actor_id <> v_buyer_id AND COALESCE(v_actor_role, 'user') <> 'admin' THEN
    RAISE EXCEPTION 'Chỉ người mua hoặc Admin mới được phép xác nhận hoàn tất đơn hàng';
  END IF;

  -- Lock seller wallet
  SELECT pending_balance, available_balance INTO v_prev_pending, v_prev_avail
  FROM public.seller_wallets
  WHERE seller_id = v_seller_id
  FOR UPDATE;

  IF v_prev_pending < v_earnings THEN
    RAISE EXCEPTION 'Lỗi dữ liệu: Số dư chờ duyệt của người bán không đủ để chốt đơn';
  END IF;

  -- Update seller order status
  UPDATE public.seller_orders
  SET status = 'completed', updated_at = now()
  WHERE id = p_seller_order_id;

  UPDATE public.seller_wallets
  SET pending_balance = pending_balance - v_earnings,
      available_balance = available_balance + v_earnings,
      updated_at = now()
  WHERE seller_id = v_seller_id;

  -- Record ledger transaction
  INSERT INTO public.seller_ledger_transactions (
    seller_id, seller_order_id, type, amount, platform_fee, balance_before, balance_after, description
  )
  VALUES (
    v_seller_id, p_seller_order_id, 'sale_completed', v_earnings, v_fee,
    v_prev_avail, v_prev_avail + v_earnings, 'Đơn bán đã hoàn thành - Số dư đã khả dụng'
  );

  -- Update order_items status
  UPDATE public.order_items
  SET seller_payment_status = 'available'
  WHERE seller_order_id = p_seller_order_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_seller_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_seller_order TO authenticated;

-- ============================================================================
-- 11. RPC: UPDATE SELLER ORDER STATUS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_seller_order_status(
  p_seller_order_id UUID,
  p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_seller_id UUID;
  v_current_status TEXT;
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập';
  END IF;

  IF p_new_status NOT IN ('confirmed', 'shipping') THEN
    RAISE EXCEPTION 'Trạng thái chuyển đổi không hợp lệ';
  END IF;

  SELECT seller_id, status INTO v_seller_id, v_current_status
  FROM public.seller_orders
  WHERE id = p_seller_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đơn bán không tồn tại';
  END IF;

  IF v_seller_id <> v_actor_id THEN
    RAISE EXCEPTION 'Không có quyền thao tác đơn bán này';
  END IF;

  IF p_new_status = 'confirmed' AND v_current_status <> 'pending' THEN
    RAISE EXCEPTION 'Chỉ có thể xác nhận đơn từ trạng thái chờ xử lý (pending)';
  END IF;

  IF p_new_status = 'shipping' AND v_current_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Chỉ có thể chuyển trạng thái giao hàng từ đơn đã xác nhận (confirmed)';
  END IF;

  UPDATE public.seller_orders
  SET status = p_new_status, updated_at = now()
  WHERE id = p_seller_order_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_seller_order_status FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_seller_order_status TO authenticated;

-- ============================================================================
-- 12. RPC: REQUEST SELLER WITHDRAWAL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_seller_withdrawal(
  p_amount NUMERIC,
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_seller_id UUID;
  v_available NUMERIC;
  v_withdrawal_id UUID;
BEGIN
  v_seller_id := auth.uid();
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Số tiền rút không hợp lệ';
  END IF;

  -- Lock wallet
  SELECT available_balance INTO v_available
  FROM public.seller_wallets
  WHERE seller_id = v_seller_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < p_amount THEN
    RAISE EXCEPTION 'Số dư khả dụng không đủ. Bạn chỉ có thể rút tối đa %', v_available;
  END IF;

  -- Move available -> reserved
  UPDATE public.seller_wallets
  SET available_balance = available_balance - p_amount,
      reserved_balance = reserved_balance + p_amount,
      updated_at = now()
  WHERE seller_id = v_seller_id;

  -- Create withdrawal
  INSERT INTO public.seller_withdrawals (
    seller_id, amount, bank_name, account_number, account_name, status
  )
  VALUES (
    v_seller_id, p_amount, p_bank_name, p_account_number, p_account_name, 'pending'
  )
  RETURNING id INTO v_withdrawal_id;

  -- Create ledger transaction
  INSERT INTO public.seller_ledger_transactions (
    seller_id, type, amount, balance_before, balance_after, description
  )
  VALUES (
    v_seller_id, 'withdrawal_reserved', -p_amount, v_available, v_available - p_amount, 'Yêu cầu rút tiền đang chờ xử lý'
  );

  RETURN v_withdrawal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_seller_withdrawal FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_seller_withdrawal TO authenticated;

-- ============================================================================
-- 13. RPC: PROCESS SELLER PAYOUT (ADMIN ONLY)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_seller_payout(
  p_withdrawal_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_role TEXT;
  v_seller_id UUID;
  v_amount NUMERIC;
  v_status TEXT;
  v_reserved NUMERIC;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = v_admin_id;
  IF COALESCE(v_admin_role, '') <> 'admin' THEN
    RAISE EXCEPTION 'Không có quyền thực hiện';
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Hành động không hợp lệ';
  END IF;

  -- Lock withdrawal
  SELECT seller_id, amount, status
  INTO v_seller_id, v_amount, v_status
  FROM public.seller_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yêu cầu rút tiền không tồn tại';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Yêu cầu rút tiền này đã được xử lý từ trước';
  END IF;

  -- Lock wallet
  SELECT reserved_balance INTO v_reserved
  FROM public.seller_wallets
  WHERE seller_id = v_seller_id
  FOR UPDATE;

  IF v_reserved < v_amount THEN
    RAISE EXCEPTION 'Lỗi dữ liệu: Số dư đang khóa của người bán không đủ để xử lý';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.seller_wallets
    SET reserved_balance = reserved_balance - v_amount,
        withdrawn_balance = withdrawn_balance + v_amount,
        updated_at = now()
    WHERE seller_id = v_seller_id;

    UPDATE public.seller_withdrawals
    SET status = 'approved', processed_by = v_admin_id, processed_at = now()
    WHERE id = p_withdrawal_id;

    INSERT INTO public.seller_ledger_transactions (
      seller_id, type, amount, balance_before, balance_after, description
    )
    VALUES (
      v_seller_id, 'withdrawal_completed', v_amount, v_reserved, v_reserved - v_amount, 'Yêu cầu rút tiền đã được hoàn tất'
    );

  ELSIF p_action = 'reject' THEN
    UPDATE public.seller_wallets
    SET reserved_balance = reserved_balance - v_amount,
        available_balance = available_balance + v_amount,
        updated_at = now()
    WHERE seller_id = v_seller_id;

    UPDATE public.seller_withdrawals
    SET status = 'rejected', rejection_reason = p_rejection_reason, processed_by = v_admin_id, processed_at = now()
    WHERE id = p_withdrawal_id;

    INSERT INTO public.seller_ledger_transactions (
      seller_id, type, amount, balance_before, balance_after, description
    )
    VALUES (
      v_seller_id, 'withdrawal_rejected', v_amount, v_reserved, v_reserved - v_amount, 'Yêu cầu rút tiền bị từ chối: ' || COALESCE(p_rejection_reason, '')
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.process_seller_payout FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_seller_payout TO authenticated;

-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;

-- products & product_variants
CREATE POLICY "Public read active products" ON public.products
  FOR SELECT TO authenticated, anon
  USING (is_active = true AND deleted_at IS NULL AND (listing_status = 'active' OR product_source = 'platform'));

CREATE POLICY "Sellers can manage their own products" ON public.products
  FOR ALL TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Admin can manage all products" ON public.products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read active variants" ON public.product_variants
  FOR SELECT TO authenticated, anon
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.id = product_variants.product_id 
      AND p.is_active = true 
      AND p.deleted_at IS NULL 
      AND (p.listing_status = 'active' OR p.product_source = 'platform')
    )
  );

CREATE POLICY "Sellers can manage their own variants" ON public.product_variants
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.seller_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.seller_id = auth.uid())
  );

CREATE POLICY "Admin can manage all variants" ON public.product_variants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- marketplace_settings
CREATE POLICY "Public read marketplace settings" ON public.marketplace_settings
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admin update marketplace settings" ON public.marketplace_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- seller_orders
CREATE POLICY "Seller or Buyer read seller_orders" ON public.seller_orders
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Revoked direct UPDATE. Everything must go through RPCs now.

-- seller_wallets
CREATE POLICY "Seller read own wallet" ON public.seller_wallets
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- seller_ledger_transactions
CREATE POLICY "Seller read own ledger" ON public.seller_ledger_transactions
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- seller_withdrawals
CREATE POLICY "Seller create and read own withdrawals" ON public.seller_withdrawals
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
