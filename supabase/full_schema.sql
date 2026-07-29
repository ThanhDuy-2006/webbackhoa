-- ==============================================================================
-- BÁCH HÓA WEB - HOÀN CHỈNH TOÀN BỘ CƠ SỞ DỮ LIỆU SUPABASE (FULL DATABASE SCHEMA)
-- Sao chép toàn bộ file này và chạy 1 lần duy nhất trong Supabase > SQL Editor
-- ==============================================================================

-- 1. KÍCH HOẠT EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TẠO BẢNG CƠ SỞ (BASE TABLES)
-- ==============================================================================

-- PROFILES (Thông tin người dùng)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  email text UNIQUE,
  phone text,
  avatar_url text,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  revenue_role text DEFAULT 'none' CHECK (revenue_role IN ('super_admin', 'revenue_manager', 'revenue_viewer', 'none')),
  balance numeric(12,2) DEFAULT 0.00,
  is_blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ADDRESSES (Địa chỉ giao hàng)
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_name text NOT NULL,
  phone text NOT NULL,
  province text NOT NULL,
  district text NOT NULL,
  ward text NOT NULL,
  address_detail text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CATEGORIES (Danh mục sản phẩm)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PRODUCTS (Sản phẩm)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  sale_price numeric(12,2) CHECK (sale_price >= 0),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  images jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  -- Smart Image Tracking
  image_source text NOT NULL DEFAULT 'auto' CHECK (image_source IN ('auto', 'manual')),
  image_status text NOT NULL DEFAULT 'unchecked' CHECK (image_status IN ('unchecked', 'searching', 'valid', 'invalid', 'needs_review')),
  image_last_checked_at timestamp with time zone,
  image_retry_count integer NOT NULL DEFAULT 0 CHECK (image_retry_count >= 0),
  image_failed_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PRODUCT VARIANTS (Phân loại sản phẩm)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sku text,
  name text NOT NULL,
  price numeric(12,2) CHECK (price >= 0),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CARTS (Giỏ hàng)
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_product_id_variant_id_idx ON public.carts (user_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ORDERS (Đơn hàng)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_code text UNIQUE NOT NULL,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  discount_amount numeric(12,2) DEFAULT 0.00 CHECK (discount_amount >= 0),
  final_amount numeric(12,2) NOT NULL CHECK (final_amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled', 'refunded')),
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_method text DEFAULT 'wallet' CHECK (payment_method IN ('wallet')),
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  receiver_address text NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ORDER ITEMS (Chi tiết đơn hàng)
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_name text,
  product_price numeric(12,2) NOT NULL CHECK (product_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TOPUP REQUESTS (Yêu cầu nạp tiền)
CREATE TABLE IF NOT EXISTS public.topup_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  transfer_content text UNIQUE NOT NULL,
  proof_image_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- WALLET TRANSACTIONS (Lịch sử giao dịch ví)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('topup', 'payment', 'refund', 'adjustment', 'revenue_share', 'revenue_share_reversal')),
  amount numeric(12,2) NOT NULL,
  balance_before numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  related_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  related_topup_id uuid REFERENCES public.topup_requests(id) ON DELETE SET NULL,
  note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- COUPONS (Mã giảm giá)
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('percent', 'fixed')),
  value numeric(12,2) NOT NULL CHECK (value > 0),
  min_order_amount numeric(12,2) DEFAULT 0.00 CHECK (min_order_amount >= 0),
  max_discount numeric(12,2) CHECK (max_discount >= 0),
  usage_limit integer,
  used_count integer DEFAULT 0 CHECK (used_count >= 0),
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- BANNERS (Banner quảng cáo)
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  position integer DEFAULT 0,
  target_device text DEFAULT 'all' CHECK (target_device IN ('all', 'desktop', 'mobile')),
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- NOTIFICATIONS (Thông báo)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ADMIN LOGS (Nhật ký thao tác admin)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- WISHLISTS (Sản phẩm yêu thích)
CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, product_id)
);

-- PRODUCT REVIEWS (Đánh giá sản phẩm)
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  images jsonb DEFAULT '[]'::jsonb,
  is_hidden boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, product_id, order_item_id)
);

-- INVENTORY LOGS (Lịch sử kho hàng)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('IMPORT', 'EXPORT', 'ADJUST')),
  qty_before integer NOT NULL CHECK (qty_before >= 0),
  qty_after integer NOT NULL CHECK (qty_after >= 0),
  reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SYSTEM SETTINGS (Cấu hình hệ thống)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PRODUCT IMAGE CACHE (Bộ nhớ đệm ảnh tự động)
CREATE TABLE IF NOT EXISTS public.product_image_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_product_name text NOT NULL UNIQUE,
  image_url text NOT NULL,
  provider text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_validated_at timestamp with time zone,
  usage_count integer DEFAULT 0 NOT NULL
);

-- CANDIDATE SESSIONS & CANDIDATES (Phiên chọn ảnh thủ công)
CREATE TABLE IF NOT EXISTS public.product_image_candidate_sessions (
  id text PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  form_session_id text,
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.product_image_candidates (
  id text PRIMARY KEY,
  session_id text REFERENCES public.product_image_candidate_sessions(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  metadata_score integer NOT NULL,
  visual_score integer,
  photographer text,
  source_page_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REVENUE SHARE TABLES (Bảng luật chia tiền sản phẩm)
CREATE TABLE IF NOT EXISTS public.product_revenue_rules (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  sharing_method text NOT NULL CHECK (sharing_method IN ('equal', 'percentage', 'fixed')),
  status text NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'paused', 'expired', 'archived')) DEFAULT 'draft',
  version integer DEFAULT 1 NOT NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamp with time zone,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_only_one_target CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL) OR 
    (product_id IS NULL AND variant_id IS NOT NULL)
  ),
  CONSTRAINT unique_product_rule UNIQUE (product_id),
  CONSTRAINT unique_variant_rule UNIQUE (variant_id)
);

CREATE TABLE IF NOT EXISTS public.product_revenue_recipients (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  rule_id uuid REFERENCES public.product_revenue_rules(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  percentage numeric(5,2) CHECK (percentage > 0 AND percentage <= 100),
  fixed_amount numeric(12,2) CHECK (fixed_amount > 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_rule_recipient UNIQUE (rule_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.product_revenue_shares (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.product_revenue_rules(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  percentage numeric(5,2),
  status text NOT NULL CHECK (status IN ('completed', 'reversed')) DEFAULT 'completed',
  wallet_transaction_id uuid REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  order_code_snapshot text NOT NULL,
  product_name_snapshot text NOT NULL,
  admin_name_snapshot text NOT NULL,
  recipient_name_snapshot text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_order_item_recipient_status UNIQUE (order_item_id, recipient_id, status)
);

CREATE TABLE IF NOT EXISTS public.revenue_share_activities (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_name text NOT NULL,
  product_name text NOT NULL,
  recipients_count integer NOT NULL CHECK (recipients_count > 0),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. CÁC INDEX TỐI ƯU HÓA HIỆU NĂNG (PERFORMANCE INDEXES)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products(category_id, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_image_cron ON public.products(image_status, image_source, image_last_checked_at);
CREATE INDEX IF NOT EXISTS idx_product_image_cache_normalized_name ON public.product_image_cache (normalized_product_name);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON public.topup_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_candidate_sessions_admin ON public.product_image_candidate_sessions(admin_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_candidate_sessions_product ON public.product_image_candidate_sessions(product_id);
CREATE INDEX IF NOT EXISTS idx_candidate_sessions_form ON public.product_image_candidate_sessions(form_session_id);

-- ==============================================================================
-- 4. HÀM TRIGGER VÀ UTILITY FUNCTIONS
-- ==============================================================================

-- FUNCTION: TỰ ĐỘNG TẠO PROFILE KHI ĐĂNG KÝ MỚI
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- FUNCTION: TỰ ĐỘNG CẬP NHẬT THỜI GIAN UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_topup_requests_updated_at BEFORE UPDATE ON public.topup_requests FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
CREATE TRIGGER set_product_revenue_rules_updated_at BEFORE UPDATE ON public.product_revenue_rules FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- HELPER: KIỂM TRA QUYỀN ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ==============================================================================
-- 5. STORED PROCEDURES (RPCs) - CHECKOUT, TOPUP & REVENUE SHARING
-- ==============================================================================

-- RPC: APPROVE TOPUP REQUEST
CREATE OR REPLACE FUNCTION public.approve_topup_request(
  p_topup_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_topup RECORD;
  v_user RECORD;
  v_new_balance NUMERIC;
BEGIN
  SELECT * INTO v_topup FROM topup_requests WHERE id = p_topup_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy yêu cầu nạp tiền');
  END IF;

  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yêu cầu này đã được xử lý trước đó');
  END IF;

  SELECT * INTO v_user FROM profiles WHERE id = v_topup.user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy người dùng');
  END IF;

  v_new_balance := v_user.balance + v_topup.amount;

  UPDATE topup_requests
  SET status = 'approved',
      admin_note = p_admin_note,
      approved_by = p_admin_id,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_topup_id;

  UPDATE profiles
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_user.id;

  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_before, balance_after, related_topup_id, note
  ) VALUES (
    v_user.id, 'topup', v_topup.amount, v_user.balance, v_new_balance, p_topup_id, 'Nạp tiền thành công'
  );

  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (p_admin_id, 'APPROVE_TOPUP', 'topup_requests', p_topup_id, jsonb_build_object('amount', v_topup.amount, 'user_id', v_topup.user_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: REJECT TOPUP REQUEST
CREATE OR REPLACE FUNCTION public.reject_topup_request(
  p_topup_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_topup RECORD;
BEGIN
  SELECT * INTO v_topup FROM topup_requests WHERE id = p_topup_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy yêu cầu nạp tiền');
  END IF;

  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yêu cầu này đã được xử lý trước đó');
  END IF;

  UPDATE topup_requests
  SET status = 'rejected',
      admin_note = p_admin_note,
      approved_by = p_admin_id,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_topup_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: CHECKOUT (Thanh toán đơn hàng, trừ kho & tạo giao dịch)
CREATE OR REPLACE FUNCTION public.checkout(
  p_user_id uuid,
  p_order_code text,
  p_total_amount numeric(12,2),
  p_discount_amount numeric(12,2),
  p_final_amount numeric(12,2),
  p_receiver_name text,
  p_receiver_phone text,
  p_receiver_address text,
  p_note text,
  p_coupon_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%rowtype;
  v_order_id uuid;
  v_cart_item record;
  v_product products%rowtype;
  v_variant product_variants%rowtype;
  v_item_price numeric(12,2);
  v_item_stock integer;
  v_coupon coupons%rowtype;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_profile.is_blocked THEN
    RAISE EXCEPTION 'Tài khoản đã bị khóa';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM carts WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Giỏ hàng trống';
  END IF;

  IF p_coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon FROM coupons WHERE code = p_coupon_code FOR UPDATE;
    IF NOT FOUND OR NOT v_coupon.is_active OR v_coupon.is_deleted OR v_coupon.end_date < NOW() OR v_coupon.start_date > NOW() THEN
      RAISE EXCEPTION 'Mã giảm giá không hợp lệ hoặc đã hết hạn';
    END IF;
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'Mã giảm giá đã hết lượt sử dụng';
    END IF;
    IF p_total_amount < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã giảm giá';
    END IF;
    UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  INSERT INTO orders (user_id, order_code, total_amount, discount_amount, final_amount, status, payment_status, payment_method, receiver_name, receiver_phone, receiver_address, note)
  VALUES (p_user_id, p_order_code, p_total_amount, p_discount_amount, p_final_amount, 'confirmed', 'paid', 'wallet', p_receiver_name, p_receiver_phone, p_receiver_address, p_note)
  RETURNING id INTO v_order_id;

  FOR v_cart_item IN (SELECT product_id, variant_id, quantity FROM carts WHERE user_id = p_user_id) LOOP
    SELECT * INTO v_product FROM products WHERE id = v_cart_item.product_id FOR UPDATE;
    IF NOT FOUND OR NOT v_product.is_active OR v_product.is_deleted THEN
      RAISE EXCEPTION 'Sản phẩm không tồn tại hoặc đã ngừng bán';
    END IF;

    IF v_cart_item.variant_id IS NOT NULL THEN
      SELECT * INTO v_variant FROM product_variants WHERE id = v_cart_item.variant_id FOR UPDATE;
      IF NOT FOUND OR NOT v_variant.is_active THEN
        RAISE EXCEPTION 'Phân loại sản phẩm không tồn tại';
      END IF;
      v_item_price := coalesce(v_variant.price, v_product.sale_price, v_product.price);
      v_item_stock := v_variant.stock;
      
      IF v_item_stock < v_cart_item.quantity THEN
        RAISE EXCEPTION 'Sản phẩm % (%) không đủ hàng trong kho', v_product.name, v_variant.name;
      END IF;
      
      UPDATE product_variants SET stock = stock - v_cart_item.quantity WHERE id = v_variant.id;
      
      INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, product_price, quantity, subtotal)
      VALUES (v_order_id, v_product.id, v_variant.id, v_product.name, v_variant.name, v_item_price, v_cart_item.quantity, v_item_price * v_cart_item.quantity);
      
      INSERT INTO inventory_logs (product_id, variant_id, type, qty_before, qty_after, reason, created_by)
      VALUES (v_product.id, v_variant.id, 'EXPORT', v_item_stock, v_item_stock - v_cart_item.quantity, 'Bán hàng (Đơn ' || p_order_code || ')', p_user_id);
    ELSE
      v_item_price := coalesce(v_product.sale_price, v_product.price);
      v_item_stock := v_product.stock;

      IF v_item_stock < v_cart_item.quantity THEN
        RAISE EXCEPTION 'Sản phẩm % không đủ hàng trong kho', v_product.name;
      END IF;

      UPDATE products SET stock = stock - v_cart_item.quantity WHERE id = v_product.id;
      
      INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
      VALUES (v_order_id, v_product.id, v_product.name, v_item_price, v_cart_item.quantity, v_item_price * v_cart_item.quantity);

      INSERT INTO inventory_logs (product_id, type, qty_before, qty_after, reason, created_by)
      VALUES (v_product.id, 'EXPORT', v_item_stock, v_item_stock - v_cart_item.quantity, 'Bán hàng (Đơn ' || p_order_code || ')', p_user_id);
    END IF;
  END LOOP;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, related_order_id, note)
  VALUES (p_user_id, 'payment', p_final_amount, v_profile.balance, v_profile.balance - p_final_amount, v_order_id, 'Thanh toán đơn hàng ' || p_order_code);

  UPDATE profiles SET balance = balance - p_final_amount WHERE id = p_user_id;
  DELETE FROM carts WHERE user_id = p_user_id;

  RETURN v_order_id;
END;
$$;

-- RPC: PROCESS ORDER REVENUE SHARING (Chia tiền sản phẩm)
CREATE OR REPLACE FUNCTION public.process_order_revenue_sharing(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_name text;
  v_order_status text;
  v_order_code text;
  v_total_amount numeric(12,2);
  v_discount_amount numeric(12,2);
  v_order_item RECORD;
  v_rule RECORD;
  v_recipient RECORD;
  v_allocated_discount numeric(12,2);
  v_net_amount numeric(12,2);
  v_share_amount numeric(12,2);
  v_recipient_count integer;
  v_total_rule_fixed numeric(12,2);
  v_tx_id uuid;
  v_shared_count integer := 0;
  v_total_shared_amount numeric(12,2) := 0;
  v_recipient_name text;
  v_product_name text;
  v_method_desc text;
  v_activity_desc text;
BEGIN
  SELECT status, order_code, total_amount, discount_amount 
  INTO v_order_status, v_order_code, v_total_amount, v_discount_amount
  FROM public.orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy đơn hàng');
  END IF;

  IF v_order_status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Đơn hàng chưa hoàn thành');
  END IF;

  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    SELECT id, full_name INTO v_admin_id, v_admin_name 
    FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1;
  ELSE
    SELECT full_name INTO v_admin_name 
    FROM public.profiles 
    WHERE id = v_admin_id;
  END IF;

  IF v_admin_name IS NULL THEN
    v_admin_name := 'Hệ thống';
  END IF;

  FOR v_order_item IN 
    SELECT oi.id, oi.product_id, oi.variant_id, oi.product_name, oi.product_price, oi.quantity, oi.subtotal, p.name as raw_product_name
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    FOR UPDATE
  LOOP
    v_product_name := COALESCE(v_order_item.raw_product_name, v_order_item.product_name);
    v_rule := NULL;
    
    IF v_order_item.variant_id IS NOT NULL THEN
      SELECT * INTO v_rule
      FROM public.product_revenue_rules
      WHERE variant_id = v_order_item.variant_id
        AND status IN ('active', 'approved')
        AND deleted_at IS NULL
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      LIMIT 1;
    END IF;

    IF v_rule IS NULL AND v_order_item.product_id IS NOT NULL THEN
      SELECT * INTO v_rule
      FROM public.product_revenue_rules
      WHERE product_id = v_order_item.product_id
        AND status IN ('active', 'approved')
        AND deleted_at IS NULL
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      LIMIT 1;
    END IF;

    IF v_rule IS NOT NULL THEN
      SELECT COUNT(*), COALESCE(SUM(fixed_amount), 0)
      INTO v_recipient_count, v_total_rule_fixed
      FROM public.product_revenue_recipients
      WHERE rule_id = v_rule.id;

      IF v_recipient_count > 0 THEN
        IF v_total_amount > 0 THEN
          v_allocated_discount := ROUND((v_order_item.subtotal / v_total_amount) * v_discount_amount, 2);
        ELSE
          v_allocated_discount := 0;
        END IF;
        
        v_net_amount := GREATEST(0, v_order_item.subtotal - v_allocated_discount);

        FOR v_recipient IN 
          SELECT prr.id as recipient_entry_id, prr.user_id, prr.percentage, prr.fixed_amount, p.full_name, p.balance
          FROM public.product_revenue_recipients prr
          JOIN public.profiles p ON p.id = prr.user_id
          WHERE prr.rule_id = v_rule.id
          FOR UPDATE OF p
        LOOP
          IF v_rule.sharing_method = 'equal' THEN
            v_share_amount := ROUND(v_net_amount / v_recipient_count, 2);
          ELSIF v_rule.sharing_method = 'percentage' THEN
            v_share_amount := ROUND(v_net_amount * (v_recipient.percentage / 100.0), 2);
          ELSIF v_rule.sharing_method = 'fixed' THEN
            v_share_amount := v_recipient.fixed_amount * v_order_item.quantity;
          END IF;

          IF v_share_amount > 0 THEN
            IF NOT EXISTS (
              SELECT 1 FROM public.product_revenue_shares 
              WHERE order_item_id = v_order_item.id 
                AND recipient_id = v_recipient.user_id 
                AND status = 'completed'
            ) THEN
              v_recipient_name := COALESCE(v_recipient.full_name, 'Thành viên');

              INSERT INTO public.wallet_transactions (
                user_id, type, amount, balance_before, balance_after, related_order_id, note
              ) VALUES (
                v_recipient.user_id, 'revenue_share', v_share_amount, v_recipient.balance, v_recipient.balance + v_share_amount, p_order_id, 'Nhận chia tiền sản phẩm (' || v_product_name || ' - Đơn ' || v_order_code || ')'
              ) RETURNING id INTO v_tx_id;

              UPDATE public.profiles 
              SET balance = balance + v_share_amount 
              WHERE id = v_recipient.user_id;

              INSERT INTO public.product_revenue_shares (
                order_item_id, rule_id, recipient_id, amount, percentage, status, wallet_transaction_id,
                order_code_snapshot, product_name_snapshot, admin_name_snapshot, recipient_name_snapshot
              ) VALUES (
                v_order_item.id, v_rule.id, v_recipient.user_id, v_share_amount, v_recipient.percentage, 'completed', v_tx_id,
                v_order_code, v_product_name, v_admin_name, v_recipient_name
              );

              IF v_rule.sharing_method = 'percentage' THEN
                v_method_desc := v_recipient.percentage || '% doanh thu net';
              ELSIF v_rule.sharing_method = 'fixed' THEN
                v_method_desc := v_recipient.fixed_amount || 'đ / sản phẩm';
              ELSE
                v_method_desc := 'Chia đều (' || v_recipient_count || ' người)';
              END IF;

              v_activity_desc := v_admin_name || ' chia ' || v_share_amount || 'đ cho ' || v_recipient_name || ' từ sản phẩm ' || v_product_name || ' (' || v_method_desc || ')';

              INSERT INTO public.revenue_share_activities (
                admin_name, product_name, recipients_count, total_amount, description
              ) VALUES (
                v_admin_name, v_product_name, 1, v_share_amount, v_activity_desc
              );

              v_shared_count := v_shared_count + 1;
              v_total_shared_amount := v_total_shared_amount + v_share_amount;
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true, 
    'shared_count', v_shared_count, 
    'total_shared_amount', v_total_shared_amount
  );
END;
$$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_image_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_image_candidate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_image_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_revenue_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_revenue_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_revenue_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_share_activities ENABLE ROW LEVEL SECURITY;

-- POLICIES DEFINITIONS
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL USING (public.is_admin());

CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins full access addresses" ON public.addresses FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone view active categories" ON public.categories FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins full access categories" ON public.categories FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone view active products" ON public.products FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins full access products" ON public.products FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone view active variants" ON public.product_variants FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins full access variants" ON public.product_variants FOR ALL USING (public.is_admin());

CREATE POLICY "Users manage own carts" ON public.carts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins full access carts" ON public.carts FOR ALL USING (public.is_admin());

CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access orders" ON public.orders FOR ALL USING (public.is_admin());

CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users insert own order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins full access order items" ON public.order_items FOR ALL USING (public.is_admin());

CREATE POLICY "Users view own topups" ON public.topup_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own topups" ON public.topup_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access topups" ON public.topup_requests FOR ALL USING (public.is_admin());

CREATE POLICY "Users view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins full access transactions" ON public.wallet_transactions FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone view active coupons" ON public.coupons FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins full access coupons" ON public.coupons FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone view active banners" ON public.banners FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins full access banners" ON public.banners FOR ALL USING (public.is_admin());

CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins full access notifications" ON public.notifications FOR ALL USING (public.is_admin());

CREATE POLICY "Admins full access admin logs" ON public.admin_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Users manage own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins full access wishlists" ON public.wishlists FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone view visible reviews" ON public.product_reviews FOR SELECT USING (is_hidden = false OR public.is_admin() OR auth.uid() = user_id);
CREATE POLICY "Users manage own reviews" ON public.product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.product_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins full access reviews" ON public.product_reviews FOR ALL USING (public.is_admin());

CREATE POLICY "Admins view inventory logs" ON public.inventory_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins insert inventory logs" ON public.inventory_logs FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Anyone view system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins full access settings" ON public.system_settings FOR ALL USING (public.is_admin());

CREATE POLICY "Only admins manage product image cache" ON public.product_image_cache FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Only admins manage candidate sessions" ON public.product_image_candidate_sessions FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Only admins manage candidates" ON public.product_image_candidates FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Admins full access to rules" ON public.product_revenue_rules FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access to recipients" ON public.product_revenue_recipients FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access to shares" ON public.product_revenue_shares FOR ALL USING (public.is_admin());
CREATE POLICY "Users view own shares" ON public.product_revenue_shares FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Anyone view activities" ON public.revenue_share_activities FOR SELECT USING (true);
CREATE POLICY "Admins full access to activities" ON public.revenue_share_activities FOR ALL USING (public.is_admin());

-- ==============================================================================
-- 7. CẤP QUYỀN TRUY CẬP CHO POSTGRES ROLES
-- ==============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- 8. MẪU DỮ LIỆU MẪU BAN ĐẦU (SEED DATA - OPTIONAL)
-- ==============================================================================
INSERT INTO public.categories (id, name, slug, description, image_url, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Điện Thoại', 'dien-thoai', 'Điện thoại di động chính hãng', 'https://placehold.co/400?text=Phone', true),
('22222222-2222-2222-2222-222222222222', 'Laptop', 'laptop', 'Máy tính xách tay cấu hình cao', 'https://placehold.co/400?text=Laptop', true),
('33333333-3333-3333-3333-333333333333', 'Phụ Kiện', 'phu-kien', 'Phụ kiện điện thoại, máy tính', 'https://placehold.co/400?text=Accessory', true),
('44444444-4444-4444-4444-444444444444', 'Máy Tính Bảng', 'may-tinh-bang', 'iPad và các dòng tablet khác', 'https://placehold.co/400?text=Tablet', true),
('55555555-5555-5555-5555-555555555555', 'Âm Thanh', 'am-thanh', 'Tai nghe, loa bluetooth', 'https://placehold.co/400?text=Audio', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (category_id, name, slug, description, price, sale_price, stock, image_url, is_featured) VALUES
('11111111-1111-1111-1111-111111111111', 'iPhone 15 Pro Max', 'iphone-15-pro-max', 'Apple iPhone 15 Pro Max 256GB', 29990000, 28590000, 50, 'https://placehold.co/600?text=iPhone+15+Pro+Max', true),
('11111111-1111-1111-1111-111111111111', 'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Điện thoại Samsung Galaxy S24 Ultra', 31990000, 29990000, 30, 'https://placehold.co/600?text=S24+Ultra', true),
('22222222-2222-2222-2222-222222222222', 'MacBook Air M3', 'macbook-air-m3', 'Apple MacBook Air M3 13 inch 2024', 27990000, 26990000, 40, 'https://placehold.co/600?text=MacBook+Air+M3', true),
('55555555-5555-5555-5555-555555555555', 'AirPods Pro 2', 'airpods-pro-2', 'Tai nghe không dây Apple AirPods Pro 2', 5990000, 5490000, 120, 'https://placehold.co/600?text=AirPods+Pro', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.banners (title, image_url, link_url, position, is_active) VALUES
('Khuyến Mãi Hè', 'https://placehold.co/1200x400?text=Khuyen+Mai+He', '/', 1, true),
('iPhone 15 Series', 'https://placehold.co/1200x400?text=iPhone+15+Series', '/?category=dien-thoai', 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.coupons (code, type, value, min_order_amount, usage_limit, start_date, end_date) VALUES
('GIAM100K', 'fixed', 100000, 500000, 100, now(), now() + interval '30 days'),
('SALE10', 'percent', 10, 2000000, 200, now(), now() + interval '30 days')
ON CONFLICT (code) DO NOTHING;
