-- 1. Bỏ ràng buộc số dư không được âm ở bảng profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_balance_check;

-- 2. Bỏ ràng buộc số dư trước và sau không được âm ở bảng wallet_transactions
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_balance_before_check;
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_balance_after_check;

-- 3. Cập nhật lại logic Checkout để không chặn khi số tiền bị âm (Phiên bản tương thích với database của bạn)
-- Dưới đây là RPC public.checkout đã được lược bỏ bước kiểm tra số dư
-- (Chạy toàn bộ đoạn code dưới đây)

CREATE OR REPLACE FUNCTION public.checkout(
  p_user_id uuid,
  p_order_code text,
  p_total_amount numeric(12,2),
  p_discount_amount numeric(12,2),
  p_final_amount numeric(12,2),
  p_receiver_name text,
  p_receiver_phone text,
  p_receiver_address text,
  p_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  v_balance numeric(12,2);
  v_order_id uuid;
  v_cart_item record;
  v_product products%rowtype;
begin
  -- Lấy số dư hiện tại
  select balance into v_balance from profiles where id = p_user_id for update;

  -- BỎ KIỂM TRA SỐ DƯ (if v_balance < p_final_amount...) ĐỂ CHO PHÉP MUA ÂM TIỀN

  -- Kiểm tra giỏ hàng
  if not exists (select 1 from carts where user_id = p_user_id) then
    raise exception 'Giỏ hàng trống';
  end if;

  -- Tạo đơn hàng
  insert into orders (user_id, order_code, total_amount, discount_amount, final_amount, status, payment_status, payment_method, receiver_name, receiver_phone, receiver_address, note)
  values (p_user_id, p_order_code, p_total_amount, p_discount_amount, p_final_amount, 'confirmed', 'paid', 'wallet', p_receiver_name, p_receiver_phone, p_receiver_address, p_note)
  returning id into v_order_id;

  -- Xử lý từng sản phẩm trong giỏ hàng
  for v_cart_item in (select product_id, quantity from carts where user_id = p_user_id) loop
    select * into v_product from products where id = v_cart_item.product_id for update;
    if not found or not v_product.is_active then
      raise exception 'Sản phẩm % không tồn tại hoặc đã ngừng bán', v_product.name;
    end if;

    if v_product.stock < v_cart_item.quantity then
      raise exception 'Sản phẩm % không đủ hàng trong kho', v_product.name;
    end if;

    -- Trừ tồn kho
    update products set stock = stock - v_cart_item.quantity where id = v_product.id;

    -- Thêm chi tiết đơn hàng
    insert into order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      coalesce(v_product.sale_price, v_product.price),
      v_cart_item.quantity,
      coalesce(v_product.sale_price, v_product.price) * v_cart_item.quantity
    );
  end loop;

  -- Tạo lịch sử giao dịch (wallet_transactions)
  insert into wallet_transactions (user_id, type, amount, balance_before, balance_after, related_order_id, note)
  values (p_user_id, 'payment', p_final_amount, v_balance, v_balance - p_final_amount, v_order_id, 'Thanh toán đơn hàng ' || p_order_code);

  -- Trừ tiền trong ví (profiles)
  update profiles set balance = balance - p_final_amount where id = p_user_id;

  -- Xóa giỏ hàng
  delete from carts where user_id = p_user_id;

  return v_order_id;
end;
$$;
