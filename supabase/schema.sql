-- ENABLE EXTENSIONS
create extension if not exists "uuid-ossp";

-- PROFILES
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text unique,
  phone text,
  avatar_url text,
  role text default 'user' check (role in ('admin', 'user')),
  balance numeric(12,2) default 0.00,
  is_blocked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ADDRESSES
create table addresses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  receiver_name text not null,
  phone text not null,
  province text not null,
  district text not null,
  ward text not null,
  address_detail text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CATEGORIES
create table categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PRODUCTS
create table products (
  id uuid default uuid_generate_v4() primary key,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  sale_price numeric(12,2) check (sale_price >= 0),
  stock integer default 0 check (stock >= 0),
  image_url text,
  images jsonb default '[]'::jsonb,
  is_active boolean default true,
  is_featured boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CARTS
create table carts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  quantity integer not null check (quantity > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, product_id)
);

-- ORDERS
create table orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  order_code text unique not null,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  discount_amount numeric(12,2) default 0.00 check (discount_amount >= 0),
  final_amount numeric(12,2) not null check (final_amount >= 0),
  status text default 'pending' check (status in ('pending', 'confirmed', 'shipping', 'completed', 'cancelled', 'refunded')),
  payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  payment_method text default 'wallet' check (payment_method in ('wallet')),
  receiver_name text not null,
  receiver_phone text not null,
  receiver_address text not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ORDER_ITEMS
create table order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  product_price numeric(12,2) not null check (product_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TOPUP_REQUESTS
create table topup_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  transfer_content text unique not null,
  proof_image_url text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- WALLET_TRANSACTIONS
create table wallet_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('topup', 'payment', 'refund', 'adjustment')),
  amount numeric(12,2) not null,
  balance_before numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  related_order_id uuid references orders(id) on delete set null,
  related_topup_id uuid references topup_requests(id) on delete set null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- COUPONS
create table coupons (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(12,2) not null check (value > 0),
  min_order_amount numeric(12,2) default 0.00 check (min_order_amount >= 0),
  max_discount numeric(12,2) check (max_discount >= 0),
  usage_limit integer,
  used_count integer default 0 check (used_count >= 0),
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BANNERS
create table banners (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  image_url text not null,
  link_url text,
  position integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NOTIFICATIONS
create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ADMIN_LOGS
create table admin_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references profiles(id) on delete cascade not null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- FUNCTION: HANDLE NEW USER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- FUNCTION: AUTO UPDATE UPDATED_AT
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on profiles for each row execute procedure handle_updated_at();
create trigger set_addresses_updated_at before update on addresses for each row execute procedure handle_updated_at();
create trigger set_categories_updated_at before update on categories for each row execute procedure handle_updated_at();
create trigger set_products_updated_at before update on products for each row execute procedure handle_updated_at();
create trigger set_carts_updated_at before update on carts for each row execute procedure handle_updated_at();
create trigger set_orders_updated_at before update on orders for each row execute procedure handle_updated_at();
create trigger set_topup_requests_updated_at before update on topup_requests for each row execute procedure handle_updated_at();
create trigger set_coupons_updated_at before update on coupons for each row execute procedure handle_updated_at();
create trigger set_banners_updated_at before update on banners for each row execute procedure handle_updated_at();
-- RPC for approving a top-up request idempotently
CREATE OR REPLACE FUNCTION approve_topup_request(
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
  -- 1. Lock the topup request to prevent race conditions
  SELECT * INTO v_topup
  FROM topup_requests
  WHERE id = p_topup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy yêu cầu nạp tiền');
  END IF;

  -- 2. Check if already processed
  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yêu cầu này đã được xử lý trước đó');
  END IF;

  -- 3. Lock user profile to update balance safely
  SELECT * INTO v_user
  FROM profiles
  WHERE id = v_topup.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy người dùng');
  END IF;

  -- 4. Calculate new balance
  v_new_balance := v_user.balance + v_topup.amount;

  -- 5. Update Topup Request
  UPDATE topup_requests
  SET status = 'approved',
      admin_note = p_admin_note,
      approved_by = p_admin_id,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_topup_id;

  -- 6. Update User Balance
  UPDATE profiles
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_user.id;

  -- 7. Insert Wallet Transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    related_topup_id,
    note
  ) VALUES (
    v_user.id,
    'topup',
    v_topup.amount,
    v_user.balance,
    v_new_balance,
    p_topup_id,
    'Nạp tiền thành công'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC for rejecting a top-up request
CREATE OR REPLACE FUNCTION reject_topup_request(
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
  -- 1. Lock the topup request
  SELECT * INTO v_topup
  FROM topup_requests
  WHERE id = p_topup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy yêu cầu nạp tiền');
  END IF;

  -- 2. Check if already processed
  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yêu cầu này đã được xử lý trước đó');
  END IF;

  -- 3. Update Topup Request
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


-- ADD IS_DELETED TO CATEGORIES AND PRODUCTS
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_deleted boolean default false;


-- ADD IS_DELETED TO CATEGORIES AND PRODUCTS
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_deleted boolean default false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted boolean default false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- PRODUCT IMAGE CANDIDATE SESSIONS & CANDIDATES
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

-- GRANT PERMISSIONS TO POSTGRES ROLES
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
