-- STRICT RPCs V2

-- 1. APPROVE TOPUP (Idempotent, Wallet Tx, Admin Log)
create or replace function public.approve_topup(p_topup_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_topup topup_requests%rowtype;
  v_balance numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_topup from topup_requests where id = p_topup_id for update;
  if not found then
    raise exception 'Topup request not found';
  end if;

  -- Idempotent check
  if v_topup.status = 'approved' then
    return; -- Already approved, do nothing safely
  end if;
  if v_topup.status = 'rejected' then
    raise exception 'Cannot approve a rejected topup. Reset to pending first.';
  end if;

  -- Update topup status
  update topup_requests
  set status = 'approved',
      approved_by = p_admin_id,
      approved_at = now()
  where id = p_topup_id;

  -- Get user balance
  select balance into v_balance from profiles where id = v_topup.user_id for update;

  -- Log transaction
  insert into wallet_transactions (user_id, type, amount, balance_before, balance_after, related_topup_id, note)
  values (v_topup.user_id, 'topup', v_topup.amount, v_balance, v_balance + v_topup.amount, p_topup_id, 'Admin duyệt nạp tiền');

  -- Update user balance
  update profiles set balance = balance + v_topup.amount where id = v_topup.user_id;

  -- Audit log
  insert into admin_logs (admin_id, action, target_table, target_id, metadata)
  values (p_admin_id, 'APPROVE_TOPUP', 'topup_requests', p_topup_id, jsonb_build_object('amount', v_topup.amount, 'user_id', v_topup.user_id));
end;
$$;


-- 2. CHECKOUT (Strict validations, Coupons, Inventory Log, Variants)
create or replace function public.checkout(
  p_user_id uuid,
  p_order_code text,
  p_total_amount numeric(12,2),
  p_discount_amount numeric(12,2),
  p_final_amount numeric(12,2),
  p_receiver_name text,
  p_receiver_phone text,
  p_receiver_address text,
  p_note text,
  p_coupon_code text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_profile profiles%rowtype;
  v_order_id uuid;
  v_cart_item record;
  v_product products%rowtype;
  v_variant product_variants%rowtype;
  v_item_price numeric(12,2);
  v_item_stock integer;
  v_coupon coupons%rowtype;
begin
  -- Validate user
  select * into v_profile from profiles where id = p_user_id for update;
  if v_profile.is_blocked then
    raise exception 'Tài khoản đã bị khóa';
  end if;

  -- Check cart
  if not exists (select 1 from carts where user_id = p_user_id) then
    raise exception 'Giỏ hàng trống';
  end if;

  -- Validate coupon
  if p_coupon_code is not null then
    select * into v_coupon from coupons where code = p_coupon_code for update;
    if not found or not v_coupon.is_active or v_coupon.is_deleted or v_coupon.end_date < now() or v_coupon.start_date > now() then
      raise exception 'Mã giảm giá không hợp lệ hoặc đã hết hạn';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'Mã giảm giá đã hết lượt sử dụng';
    end if;
    if p_total_amount < v_coupon.min_order_amount then
      raise exception 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã giảm giá';
    end if;
    -- Increment usage
    update coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  -- Create Order
  insert into orders (user_id, order_code, total_amount, discount_amount, final_amount, status, payment_status, payment_method, receiver_name, receiver_phone, receiver_address, note)
  values (p_user_id, p_order_code, p_total_amount, p_discount_amount, p_final_amount, 'confirmed', 'paid', 'wallet', p_receiver_name, p_receiver_phone, p_receiver_address, p_note)
  returning id into v_order_id;

  -- Process cart items
  for v_cart_item in (select product_id, variant_id, quantity from carts where user_id = p_user_id) loop
    -- Get product
    select * into v_product from products where id = v_cart_item.product_id for update;
    if not found or not v_product.is_active or v_product.is_deleted then
      raise exception 'Sản phẩm không tồn tại hoặc đã ngừng bán';
    end if;

    -- Handle variant or base product
    if v_cart_item.variant_id is not null then
      select * into v_variant from product_variants where id = v_cart_item.variant_id for update;
      if not found or not v_variant.is_active then
        raise exception 'Phân loại sản phẩm không tồn tại';
      end if;
      v_item_price := coalesce(v_variant.price, v_product.sale_price, v_product.price);
      v_item_stock := v_variant.stock;
      
      if v_item_stock < v_cart_item.quantity then
        raise exception 'Sản phẩm % (%s) không đủ hàng', v_product.name, v_variant.name;
      end if;
      
      -- Deduct variant stock
      update product_variants set stock = stock - v_cart_item.quantity where id = v_variant.id;
      
      -- Add order item
      insert into order_items (order_id, product_id, variant_id, product_name, variant_name, product_price, quantity, subtotal)
      values (v_order_id, v_product.id, v_variant.id, v_product.name, v_variant.name, v_item_price, v_cart_item.quantity, v_item_price * v_cart_item.quantity);
      
      -- Log inventory
      insert into inventory_logs (product_id, variant_id, type, qty_before, qty_after, reason, created_by)
      values (v_product.id, v_variant.id, 'EXPORT', v_item_stock, v_item_stock - v_cart_item.quantity, 'Bán hàng (Đơn ' || p_order_code || ')', p_user_id);

    else
      -- Base product
      v_item_price := coalesce(v_product.sale_price, v_product.price);
      v_item_stock := v_product.stock;

      if v_item_stock < v_cart_item.quantity then
        raise exception 'Sản phẩm % không đủ hàng', v_product.name;
      end if;

      -- Deduct base stock
      update products set stock = stock - v_cart_item.quantity where id = v_product.id;
      
      -- Add order item
      insert into order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
      values (v_order_id, v_product.id, v_product.name, v_item_price, v_cart_item.quantity, v_item_price * v_cart_item.quantity);

      -- Log inventory
      insert into inventory_logs (product_id, type, qty_before, qty_after, reason, created_by)
      values (v_product.id, 'EXPORT', v_item_stock, v_item_stock - v_cart_item.quantity, 'Bán hàng (Đơn ' || p_order_code || ')', p_user_id);
    end if;
  end loop;

  -- Create Wallet Transaction
  insert into wallet_transactions (user_id, type, amount, balance_before, balance_after, related_order_id, note)
  values (p_user_id, 'payment', p_final_amount, v_profile.balance, v_profile.balance - p_final_amount, v_order_id, 'Thanh toán đơn hàng ' || p_order_code);

  -- Deduct Balance
  update profiles set balance = balance - p_final_amount where id = p_user_id;

  -- Clear Cart
  delete from carts where user_id = p_user_id;

  return v_order_id;
end;
$$;


-- 3. UPDATE ORDER STATUS (Handle Refunds)
create or replace function public.update_order_status(p_order_id uuid, p_new_status text, p_admin_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_order orders%rowtype;
  v_user profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status = p_new_status then
    return; -- No change
  end if;

  -- Handle Refund if cancelled or refunded and was previously paid
  if p_new_status in ('cancelled', 'refunded') and v_order.payment_status = 'paid' then
    select * into v_user from profiles where id = v_order.user_id for update;
    
    -- Refund transaction
    insert into wallet_transactions (user_id, type, amount, balance_before, balance_after, related_order_id, note)
    values (v_order.user_id, 'refund', v_order.final_amount, v_user.balance, v_user.balance + v_order.final_amount, p_order_id, 'Hoàn tiền đơn hàng ' || v_order.order_code);
    
    -- Add balance
    update profiles set balance = balance + v_order.final_amount where id = v_order.user_id;
    
    -- Update payment status
    update orders set payment_status = 'refunded', status = p_new_status where id = p_order_id;
  else
    -- Just update status
    update orders set status = p_new_status where id = p_order_id;
  end if;

  -- Audit log
  insert into admin_logs (admin_id, action, target_table, target_id, metadata)
  values (p_admin_id, 'UPDATE_ORDER', 'orders', p_order_id, jsonb_build_object('old_status', v_order.status, 'new_status', p_new_status));
end;
$$;
