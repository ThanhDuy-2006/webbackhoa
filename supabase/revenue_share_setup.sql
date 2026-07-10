-- 0. TỰ ĐỘNG KHỞI TẠO BẢNG PHÂN LOẠI (PRODUCT VARIANTS) NẾU CHƯA TỒN TẠI
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  sku text,
  name text not null,
  price numeric(12,2) check (price >= 0),
  stock integer default 0 check (stock >= 0),
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Thêm các cột liên quan đến phân loại vào bảng order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id uuid references public.product_variants(id) on delete set null;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_name text;

-- 1. Cập nhật Ràng buộc type của wallet_transactions
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('topup', 'payment', 'refund', 'adjustment', 'revenue_share', 'revenue_share_reversal'));

-- 2. Thêm cột link vào bảng notifications nếu chưa tồn tại
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;

-- 3. Tạo bảng Luật chia tiền sản phẩm/phân loại
CREATE TABLE IF NOT EXISTS public.product_revenue_rules (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  sharing_method text not null check (sharing_method in ('equal', 'percentage', 'fixed')),
  status text not null check (status in ('draft', 'active', 'paused', 'expired')) default 'draft',
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint check_only_one_target check (
    (product_id is not null and variant_id is null) or 
    (product_id is null and variant_id is not null)
  ),
  constraint unique_product_rule unique (product_id),
  constraint unique_variant_rule unique (variant_id)
);

-- 4. Tạo bảng Người nhận chia sẻ của Luật
CREATE TABLE IF NOT EXISTS public.product_revenue_recipients (
  id uuid default uuid_generate_v4() primary key,
  rule_id uuid references public.product_revenue_rules(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  percentage numeric(5,2) check (percentage > 0 and percentage <= 100),
  fixed_amount numeric(12,2) check (fixed_amount > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_rule_recipient unique (rule_id, user_id)
);

-- 5. Tạo bảng Lịch sử chia sẻ doanh thu thực tế (bất biến sau khi ghi)
CREATE TABLE IF NOT EXISTS public.product_revenue_shares (
  id uuid default uuid_generate_v4() primary key,
  order_item_id uuid references public.order_items(id) on delete cascade not null,
  rule_id uuid references public.product_revenue_rules(id) on delete set null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12,2) not null,
  percentage numeric(5,2),
  status text not null check (status in ('completed', 'reversed')) default 'completed',
  wallet_transaction_id uuid references public.wallet_transactions(id) on delete set null,
  order_code_snapshot text not null,
  product_name_snapshot text not null,
  admin_name_snapshot text not null,
  recipient_name_snapshot text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_order_item_recipient_status unique (order_item_id, recipient_id, status)
);

-- 6. Tạo bảng Nhật ký hoạt động công khai để hiển thị trên Lịch sử chung
CREATE TABLE IF NOT EXISTS public.revenue_share_activities (
  id uuid default uuid_generate_v4() primary key,
  admin_name text not null,
  product_name text not null,
  recipients_count integer not null check (recipients_count > 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Kích hoạt Row Level Security (RLS) cho tất cả các bảng mới
ALTER TABLE public.product_revenue_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_revenue_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_revenue_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_share_activities ENABLE ROW LEVEL SECURITY;

-- 8. Tạo các chính sách bảo mật RLS
CREATE POLICY "Admins full access to rules" ON public.product_revenue_rules FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access to recipients" ON public.product_revenue_recipients FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access to shares" ON public.product_revenue_shares FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own shares" ON public.product_revenue_shares FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Anyone can view activities" ON public.revenue_share_activities FOR SELECT USING (true);
CREATE POLICY "Admins full access to activities" ON public.revenue_share_activities FOR ALL USING (public.is_admin());

-- 9. Hàm giao dịch RPC xử lý chia tiền khi Đơn hàng hoàn thành
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
  v_recipient_balance numeric(12,2);
  v_tx_id uuid;
  v_shared_count integer := 0;
  v_total_shared_amount numeric(12,2) := 0;
  v_recipient_name text;
  v_product_name text;
  v_method_desc text;
  v_activity_desc text;
BEGIN
  -- 1. Khóa dòng đơn hàng để tránh xử lý đồng thời chéo
  SELECT status, order_code, total_amount, discount_amount 
  INTO v_order_status, v_order_code, v_total_amount, v_discount_amount
  FROM public.orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy đơn hàng');
  END IF;

  -- 2. Đảm bảo trạng thái đơn hàng đã hoàn thành
  IF v_order_status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Đơn hàng chưa hoàn thành');
  END IF;

  -- 3. Lấy thông tin quản trị viên thực hiện
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

  -- 4. Vòng lặp qua các mục sản phẩm trong đơn hàng
  FOR v_order_item IN 
    SELECT oi.id, oi.product_id, oi.variant_id, oi.product_name, oi.product_price, oi.quantity, oi.subtotal, p.name as raw_product_name
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    FOR UPDATE
  LOOP
    v_product_name := COALESCE(v_order_item.raw_product_name, v_order_item.product_name);
    
    -- 5. Tìm luật chia tiền hoạt động (Luật phân loại có ưu tiên cao hơn luật sản phẩm)
    v_rule := NULL;
    
    -- Check variant-level rule first
    IF v_order_item.variant_id IS NOT NULL THEN
      SELECT * INTO v_rule 
      FROM public.product_revenue_rules 
      WHERE variant_id = v_order_item.variant_id 
        AND status = 'active'
        AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now());
    END IF;
    
    -- If no variant rule, check product-level rule
    IF v_rule IS NULL THEN
      SELECT * INTO v_rule 
      FROM public.product_revenue_rules 
      WHERE product_id = v_order_item.product_id 
        AND status = 'active'
        AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now());
    END IF;

    -- Nếu không có luật nào, bỏ qua sản phẩm này
    IF v_rule IS NULL THEN
      CONTINUE;
    END IF;

    -- 6. Đảm bảo chưa từng được chia cho dòng sản phẩm này để tránh trùng lặp
    PERFORM 1 
    FROM public.product_revenue_shares 
    WHERE order_item_id = v_order_item.id AND status = 'completed';
    
    IF FOUND THEN
      CONTINUE;
    END IF;

    -- 7. Tính số tiền được chia thực tế sau khi trừ giảm giá phân bổ (actual_unit_price * quantity - allocated_discount)
    IF v_total_amount > 0 THEN
      v_allocated_discount := COALESCE(v_discount_amount, 0) * (v_order_item.subtotal / v_total_amount);
    ELSE
      v_allocated_discount := 0;
    END IF;
    
    v_net_amount := v_order_item.subtotal - v_allocated_discount;
    IF v_net_amount <= 0 THEN
      CONTINUE;
    END IF;

    -- 8. Lấy danh sách người nhận của luật
    SELECT COUNT(*) INTO v_recipient_count 
    FROM public.product_revenue_recipients 
    WHERE rule_id = v_rule.id;
    
    IF v_recipient_count = 0 THEN
      CONTINUE;
    END IF;

    -- Kiểm tra nếu là chia tiền cố định, tổng số tiền chia không được vượt quá doanh thu thực nhận
    IF v_rule.sharing_method = 'fixed' THEN
      SELECT SUM(fixed_amount) INTO v_total_rule_fixed 
      FROM public.product_revenue_recipients 
      WHERE rule_id = v_rule.id;
      
      IF (v_total_rule_fixed * v_order_item.quantity) > v_net_amount THEN
        RAISE EXCEPTION 'Tổng tiền chia cố định (%) vượt quá số tiền thực nhận (%) của sản phẩm % (Đơn %)', 
          (v_total_rule_fixed * v_order_item.quantity), v_net_amount, v_product_name, v_order_code;
      END IF;
    END IF;

    -- 9. Thực hiện chia tiền cho từng người nhận
    FOR v_recipient IN 
      SELECT pr.user_id, pr.percentage, pr.fixed_amount, p.full_name, p.wallet_balance
      FROM public.product_revenue_recipients pr
      JOIN public.profiles p ON p.id = pr.user_id
      WHERE pr.rule_id = v_rule.id
    LOOP
      v_recipient_name := COALESCE(v_recipient.full_name, 'Thành viên');
      
      -- Tính toán số tiền chia theo phương thức
      IF v_rule.sharing_method = 'equal' THEN
        v_share_amount := v_net_amount / v_recipient_count;
      ELSIF v_rule.sharing_method = 'percentage' THEN
        v_share_amount := v_net_amount * (v_recipient.percentage / 100.0);
      ELSIF v_rule.sharing_method = 'fixed' THEN
        v_share_amount := v_recipient.fixed_amount * v_order_item.quantity;
      END IF;

      -- Làm tròn đến hàng đơn vị Đồng
      v_share_amount := ROUND(v_share_amount, 0);

      IF v_share_amount <= 0 THEN
        CONTINUE;
      END IF;

      -- Cập nhật số dư ví người nhận
      UPDATE public.profiles 
      SET wallet_balance = COALESCE(wallet_balance, 0) + v_share_amount
      WHERE id = v_recipient.user_id;

      -- Tạo lịch sử ví (wallet_transactions)
      INSERT INTO public.wallet_transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        related_order_id,
        note
      ) VALUES (
        v_recipient.user_id,
        'revenue_share',
        v_share_amount,
        COALESCE(v_recipient.wallet_balance, 0),
        COALESCE(v_recipient.wallet_balance, 0) + v_share_amount,
        p_order_id,
        CASE 
          WHEN v_rule.sharing_method = 'percentage' THEN 'Bạn được chia ' || v_recipient.percentage || '% tiền sản phẩm ' || v_product_name || ': +' || to_char(v_share_amount, 'FM999,999,999') || 'đ (Đơn ' || v_order_code || ')'
          ELSE 'Bạn được chia tiền sản phẩm ' || v_product_name || ': +' || to_char(v_share_amount, 'FM999,999,999') || 'đ (Đơn ' || v_order_code || ')'
        END
      ) RETURNING id INTO v_tx_id;

      -- Gửi thông báo in-app kèm Deep Link
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        link
      ) VALUES (
        v_recipient.user_id,
        'Chia sẻ doanh thu sản phẩm',
        CASE 
          WHEN v_rule.sharing_method = 'percentage' THEN 'Bạn được chia ' || v_recipient.percentage || '% tiền sản phẩm ' || v_product_name || ': +' || to_char(v_share_amount, 'FM999,999,999') || 'đ'
          ELSE 'Bạn được chia tiền sản phẩm ' || v_product_name || ': +' || to_char(v_share_amount, 'FM999,999,999') || 'đ'
        END,
        'revenue_share',
        false,
        '/tai-khoan/chia-tien'
      );

      -- Lưu lịch sử chia chi tiết (Bất biến)
      INSERT INTO public.product_revenue_shares (
        order_item_id,
        rule_id,
        recipient_id,
        amount,
        percentage,
        status,
        wallet_transaction_id,
        order_code_snapshot,
        product_name_snapshot,
        admin_name_snapshot,
        recipient_name_snapshot
      ) VALUES (
        v_order_item.id,
        v_rule.id,
        v_recipient.user_id,
        v_share_amount,
        CASE 
          WHEN v_rule.sharing_method = 'percentage' THEN v_recipient.percentage
          WHEN v_rule.sharing_method = 'equal' THEN ROUND(100.0 / v_recipient_count, 2)
          ELSE null
        END,
        'completed',
        v_tx_id,
        v_order_code,
        v_product_name,
        v_admin_name,
        v_recipient_name
      );

      v_total_shared_amount := v_total_shared_amount + v_share_amount;
    END LOOP;

    v_shared_count := v_shared_count + 1;

    -- 10. Tạo hoạt động công khai hiển thị trên Lịch sử chung (Chỉ tạo 1 dòng duy nhất cho mỗi mặt hàng được chia)
    v_method_desc := CASE 
      WHEN v_rule.sharing_method = 'equal' THEN 'chia đều'
      WHEN v_rule.sharing_method = 'percentage' THEN 'chia theo tỷ lệ %'
      WHEN v_rule.sharing_method = 'fixed' THEN 'chia tiền cố định'
    END;

    v_activity_desc := 'Admin ' || v_admin_name || ' đã chia tiền sản phẩm ' || v_product_name || ' cho ' || v_recipient_count || ' người (' || v_method_desc || '). Tổng tiền đã chia: ' || to_char(v_total_shared_amount, 'FM999,999,999') || 'đ.';
    
    INSERT INTO public.revenue_share_activities (
      admin_name,
      product_name,
      recipients_count,
      total_amount,
      description
    ) VALUES (
      v_admin_name,
      v_product_name,
      v_recipient_count,
      v_total_shared_amount,
      v_activity_desc
    );

    -- 11. Lưu nhật ký hành động Admin (admin_logs)
    INSERT INTO public.admin_logs (
      admin_id,
      action,
      target_table,
      target_id,
      metadata
    ) VALUES (
      COALESCE(auth.uid(), v_admin_id),
      'share_revenue',
      'orders',
      p_order_id,
      json_build_object(
        'order_code', v_order_code,
        'product_name', v_product_name,
        'total_shared_amount', v_total_shared_amount,
        'recipients_count', v_recipient_count
      )
    );

  END LOOP;

  RETURN json_build_object('success', true, 'shared_items', v_shared_count);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 10. Hàm giao dịch RPC xử lý Đảo ngược (Reversal) thu hồi tiền khi Đơn hàng bị Hoàn tiền hoặc Hủy bỏ
CREATE OR REPLACE FUNCTION public.reverse_order_revenue_sharing(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_name text;
  v_order_status text;
  v_order_code text;
  v_share RECORD;
  v_tx_id uuid;
  v_reversed_count integer := 0;
BEGIN
  -- 1. Khóa dòng đơn hàng để tránh xử lý đồng thời chéo
  SELECT status, order_code
  INTO v_order_status, v_order_code
  FROM public.orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy đơn hàng');
  END IF;

  -- 2. Đảm bảo trạng thái đơn hàng bị hoàn tiền hoặc hủy bỏ
  IF v_order_status != 'refunded' AND v_order_status != 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Đơn hàng chưa hoàn tiền hoặc hủy bỏ');
  END IF;

  -- 3. Lấy thông tin quản trị viên thực hiện
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

  -- 4. Tìm tất cả các giao dịch đã chia thành công chưa đảo ngược cho đơn hàng này
  FOR v_share IN 
    SELECT s.*, p.wallet_balance, p.full_name as recipient_name
    FROM public.product_revenue_shares s
    JOIN public.order_items oi ON oi.id = s.order_item_id
    JOIN public.profiles p ON p.id = s.recipient_id
    WHERE oi.order_id = p_order_id AND s.status = 'completed'
    FOR UPDATE
  LOOP
    -- Cập nhật trạng thái giao dịch cũ thành reversed
    UPDATE public.product_revenue_shares 
    SET status = 'reversed' 
    WHERE id = v_share.id;

    -- Khấu trừ tiền trong ví người nhận
    UPDATE public.profiles 
    SET wallet_balance = COALESCE(wallet_balance, 0) - v_share.amount
    WHERE id = v_share.recipient_id;

    -- Tạo lịch sử ví giao dịch thu hồi (Giá trị tiền âm)
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      amount,
      balance_before,
      balance_after,
      related_order_id,
      note
    ) VALUES (
      v_share.recipient_id,
      'revenue_share_reversal',
      -v_share.amount,
      COALESCE(v_share.wallet_balance, 0),
      COALESCE(v_share.wallet_balance, 0) - v_share.amount,
      p_order_id,
      'Thu hồi tiền chia sản phẩm ' || v_share.product_name_snapshot || ' do đơn hàng bị hoàn/hủy: -' || to_char(v_share.amount, 'FM999,999,999') || 'đ (Đơn ' || v_order_code || ')'
    ) RETURNING id INTO v_tx_id;

    -- Ghi nhận lịch sử giao dịch đảo ngược (Giao dịch mới mang giá trị âm để đảm bảo tính bất biến)
    INSERT INTO public.product_revenue_shares (
      order_item_id,
      rule_id,
      recipient_id,
      amount,
      percentage,
      status,
      wallet_transaction_id,
      order_code_snapshot,
      product_name_snapshot,
      admin_name_snapshot,
      recipient_name_snapshot
    ) VALUES (
      v_share.order_item_id,
      v_share.rule_id,
      v_share.recipient_id,
      -v_share.amount,
      v_share.percentage,
      'reversed',
      v_tx_id,
      v_order_code,
      v_share.product_name_snapshot,
      v_admin_name,
      v_share.recipient_name
    );

    -- Gửi thông báo thu hồi in-app kèm Deep Link
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      is_read,
      link
    ) VALUES (
      v_share.recipient_id,
      'Thu hồi chia sẻ doanh thu',
      'Đã thu hồi tiền chia sản phẩm ' || v_share.product_name_snapshot || ' do đơn hàng bị hoàn tiền/hủy: -' || to_char(v_share.amount, 'FM999,999,999') || 'đ',
      'revenue_share',
      false,
      '/tai-khoan/chia-tien'
    );

    v_reversed_count := v_reversed_count + 1;
  END LOOP;

  -- Ghi nhận lịch sử Admin Logs
  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_table,
    target_id,
    metadata
  ) VALUES (
    COALESCE(auth.uid(), v_admin_id),
    'reverse_revenue',
    'orders',
    p_order_id,
    json_build_object(
      'order_code', v_order_code,
      'reversed_count', v_reversed_count
    )
  );

  RETURN json_build_object('success', true, 'reversed_items', v_reversed_count);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
