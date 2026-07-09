-- V2 SCHEMA UPGRADES (Run after schema.sql)

-- 1. SOFT DELETE COLUMNS
alter table products add column if not exists is_deleted boolean default false;
alter table products add column if not exists deleted_at timestamp with time zone;

alter table categories add column if not exists is_deleted boolean default false;
alter table categories add column if not exists deleted_at timestamp with time zone;

alter table coupons add column if not exists is_deleted boolean default false;
alter table coupons add column if not exists deleted_at timestamp with time zone;

-- 2. NEW TABLES

-- PRODUCT VARIANTS
create table if not exists product_variants (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade not null,
  sku text,
  name text not null, -- e.g., "Màu Đen - 256GB"
  price numeric(12,2) check (price >= 0), -- overrides product.price if not null
  stock integer default 0 check (stock >= 0),
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create trigger set_product_variants_updated_at before update on product_variants for each row execute procedure handle_updated_at();

-- UPDATE CARTS & ORDER_ITEMS to support variants
alter table carts add column if not exists variant_id uuid references product_variants(id) on delete cascade;
-- Drop unique constraint on user_id, product_id, and add new one with variant_id
alter table carts drop constraint if exists carts_user_id_product_id_key;
create unique index if not exists carts_user_id_product_id_variant_id_idx on carts (user_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table order_items add column if not exists variant_id uuid references product_variants(id) on delete set null;
alter table order_items add column if not exists variant_name text;

-- WISHLISTS
create table if not exists wishlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, product_id)
);

-- PRODUCT REVIEWS
create table if not exists product_reviews (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  order_item_id uuid references order_items(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  images jsonb default '[]'::jsonb,
  is_hidden boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, product_id, order_item_id) -- one review per purchased item
);
create trigger set_product_reviews_updated_at before update on product_reviews for each row execute procedure handle_updated_at();

-- INVENTORY LOGS
create table if not exists inventory_logs (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade not null,
  variant_id uuid references product_variants(id) on delete cascade,
  type text not null check (type in ('IMPORT', 'EXPORT', 'ADJUST')),
  qty_before integer not null check (qty_before >= 0),
  qty_after integer not null check (qty_after >= 0),
  reason text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SYSTEM SETTINGS
create table if not exists system_settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create trigger set_system_settings_updated_at before update on system_settings for each row execute procedure handle_updated_at();

-- BANNERS UPDATE
alter table banners add column if not exists start_date timestamp with time zone;
alter table banners add column if not exists end_date timestamp with time zone;
alter table banners add column if not exists target_device text default 'all' check (target_device in ('all', 'desktop', 'mobile'));

-- ENABLE RLS FOR NEW TABLES
alter table product_variants enable row level security;
alter table wishlists enable row level security;
alter table product_reviews enable row level security;
alter table inventory_logs enable row level security;
alter table system_settings enable row level security;

-- POLICIES
create policy "Anyone can view active variants" on product_variants for select using (is_active = true or public.is_admin());
create policy "Admins full access variants" on product_variants for all using (public.is_admin());

create policy "Users manage own wishlist" on wishlists for all using (auth.uid() = user_id);
create policy "Admins full access wishlists" on wishlists for all using (public.is_admin());

create policy "Anyone view visible reviews" on product_reviews for select using (is_hidden = false or public.is_admin() or auth.uid() = user_id);
create policy "Users manage own reviews" on product_reviews for insert with check (auth.uid() = user_id);
create policy "Users update own reviews" on product_reviews for update using (auth.uid() = user_id);
create policy "Admins full access reviews" on product_reviews for all using (public.is_admin());

create policy "Admins view inventory logs" on inventory_logs for select using (public.is_admin());
create policy "Admins insert inventory logs" on inventory_logs for insert with check (public.is_admin());

create policy "Anyone view system settings" on system_settings for select using (true);
create policy "Admins full access settings" on system_settings for all using (public.is_admin());
