-- RUN THIS IN SUPABASE SQL EDITOR TO SETUP WITHDRAWAL SYSTEM

-- 1. TẠO BẢNG YÊU CẦU RÚT TIỀN (WITHDRAWAL_REQUESTS)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  bank_name TEXT DEFAULT 'Chưa cung cấp',
  account_number TEXT DEFAULT 'Chưa cung cấp',
  account_name TEXT DEFAULT 'Chưa cung cấp',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật Trigger tự động cập nhật updated_at
CREATE OR REPLACE TRIGGER set_withdrawal_requests_updated_at 
BEFORE UPDATE ON public.withdrawal_requests 
FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- 2. MỞ RỘNG BẢNG WALLET_TRANSACTIONS
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS related_withdrawal_id UUID REFERENCES public.withdrawal_requests(id) ON DELETE SET NULL;

-- Cập nhật ràng buộc type của wallet_transactions
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN ('topup', 'payment', 'refund', 'adjustment', 'revenue_share', 'revenue_share_reversal', 'withdrawal', 'withdrawal_refund'));

-- 3. CHỈ MỤC (INDEXES)
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON public.withdrawal_requests(created_at DESC);

-- 4. BẢO MẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins full access withdrawals" ON public.withdrawal_requests;

CREATE POLICY "Users can view own withdrawals" ON public.withdrawal_requests 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals" ON public.withdrawal_requests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access withdrawals" ON public.withdrawal_requests 
FOR ALL USING (public.is_admin());

-- 5. RPC TẠO YÊU CẦU RÚT TIỀN (TRANSACTION & LOCK)
CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(
  p_amount NUMERIC,
  p_bank_name TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user RECORD;
  v_new_balance NUMERIC;
  v_withdrawal_id UUID;
  v_tx_id UUID;
  v_effective_bank TEXT;
  v_effective_acc_num TEXT;
  v_effective_acc_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bạn chưa đăng nhập');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Số tiền rút phải lớn hơn 0');
  END IF;

  v_effective_bank := COALESCE(NULLIF(trim(p_bank_name), ''), 'Chưa cung cấp');
  v_effective_acc_num := COALESCE(NULLIF(trim(p_account_number), ''), 'Chưa cung cấp');
  v_effective_acc_name := upper(COALESCE(NULLIF(trim(p_account_name), ''), 'Chưa cung cấp'));

  -- 1. Khóa dòng user profile để kiểm tra số dư an toàn
  SELECT * INTO v_user
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy thông tin tài khoản');
  END IF;

  IF COALESCE(v_user.balance, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Số dư ví khả dụng không đủ để rút số tiền này');
  END IF;

  v_new_balance := v_user.balance - p_amount;

  -- 2. Tạm trừ số dư ví người dùng
  UPDATE public.profiles
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- 3. Tạo yêu cầu rút tiền
  INSERT INTO public.withdrawal_requests (
    user_id,
    amount,
    bank_name,
    account_number,
    account_name,
    status
  ) VALUES (
    v_user_id,
    p_amount,
    v_effective_bank,
    v_effective_acc_num,
    v_effective_acc_name,
    'pending'
  ) RETURNING id INTO v_withdrawal_id;

  -- 4. Ghi nhận lịch sử biến động số dư (Giao dịch rút tiền)
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    related_withdrawal_id,
    note
  ) VALUES (
    v_user_id,
    'withdrawal',
    -p_amount,
    v_user.balance,
    v_new_balance,
    v_withdrawal_id,
    'Yêu cầu rút tiền về ' || v_effective_bank || ' (' || v_effective_acc_num || ')'
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true, 
    'withdrawal_id', v_withdrawal_id,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. RPC DUYỆT RÚT TIỀN (APPROVE WITHDRAWAL)
CREATE OR REPLACE FUNCTION public.approve_withdrawal_request(
  p_withdrawal_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_withdrawal RECORD;
  v_admin_name TEXT;
BEGIN
  -- 1. Khóa yêu cầu rút tiền
  SELECT * INTO v_withdrawal
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy yêu cầu rút tiền');
  END IF;

  IF v_withdrawal.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yêu cầu này đã được xử lý trước đó (' || v_withdrawal.status || ')');
  END IF;

  -- 2. Lấy tên admin
  SELECT full_name INTO v_admin_name
  FROM public.profiles
  WHERE id = p_admin_id;

  -- 3. Cập nhật trạng thái yêu cầu
  UPDATE public.withdrawal_requests
  SET status = 'approved',
      admin_note = p_admin_note,
      processed_by = p_admin_id,
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- 4. Gửi thông báo in-app cho người dùng
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    is_read,
    link
  ) VALUES (
    v_withdrawal.user_id,
    'Rút tiền thành công',
    'Yêu cầu rút ' || to_char(v_withdrawal.amount, 'FM999,999,999') || 'đ về ngân hàng ' || v_withdrawal.bank_name || ' đã được Admin phê duyệt và chuyển khoản thành công.',
    'withdrawal',
    false,
    '/tai-khoan/rut-tien'
  );

  -- 5. Ghi nhật ký Admin logs
  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_table,
    target_id,
    metadata
  ) VALUES (
    p_admin_id,
    'APPROVE_WITHDRAWAL',
    'withdrawal_requests',
    p_withdrawal_id,
    jsonb_build_object(
      'amount', v_withdrawal.amount,
      'user_id', v_withdrawal.user_id,
      'bank_name', v_withdrawal.bank_name,
      'account_number', v_withdrawal.account_number,
      'admin_note', p_admin_note
    )
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. RPC TỪ CHỐI RÚT TIỀN (REJECT WITHDRAWAL - TỰ ĐỘNG HOÀN TIỀN VÀO VÍ)
CREATE OR REPLACE FUNCTION public.reject_withdrawal_request(
  p_withdrawal_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_withdrawal RECORD;
  v_user RECORD;
  v_new_balance NUMERIC;
  v_admin_name TEXT;
BEGIN
  IF p_admin_note IS NULL OR length(trim(p_admin_note)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vui lòng nhập lý do từ chối yêu cầu rút tiền');
  END IF;

  -- 1. Khóa yêu cầu rút tiền
  SELECT * INTO v_withdrawal
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy yêu cầu rút tiền');
  END IF;

  IF v_withdrawal.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yêu cầu này đã được xử lý trước đó (' || v_withdrawal.status || ')');
  END IF;

  -- 2. Khóa dòng user profile để hoàn lại số dư ví
  SELECT * INTO v_user
  FROM public.profiles
  WHERE id = v_withdrawal.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy người dùng');
  END IF;

  v_new_balance := COALESCE(v_user.balance, 0) + v_withdrawal.amount;

  -- 3. Hoàn trả số dư ví người dùng
  UPDATE public.profiles
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_user.id;

  -- 4. Cập nhật trạng thái yêu cầu rút tiền
  UPDATE public.withdrawal_requests
  SET status = 'rejected',
      admin_note = trim(p_admin_note),
      processed_by = p_admin_id,
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- 5. Ghi nhận lịch sử hoàn tiền vào ví (wallet_transactions)
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    related_withdrawal_id,
    note
  ) VALUES (
    v_user.id,
    'withdrawal_refund',
    v_withdrawal.amount,
    v_user.balance,
    v_new_balance,
    p_withdrawal_id,
    'Hoàn tiền yêu cầu rút: ' || trim(p_admin_note)
  );

  -- 6. Gửi thông báo in-app cho người dùng
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    is_read,
    link
  ) VALUES (
    v_user.id,
    'Yêu cầu rút tiền bị từ chối',
    'Yêu cầu rút ' || to_char(v_withdrawal.amount, 'FM999,999,999') || 'đ đã bị từ chối. Lý do: ' || trim(p_admin_note) || '. Số tiền đã được hoàn trả lại vào ví của bạn.',
    'withdrawal',
    false,
    '/tai-khoan/rut-tien'
  );

  -- 7. Ghi nhật ký Admin logs
  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_table,
    target_id,
    metadata
  ) VALUES (
    p_admin_id,
    'REJECT_WITHDRAWAL',
    'withdrawal_requests',
    p_withdrawal_id,
    jsonb_build_object(
      'amount', v_withdrawal.amount,
      'user_id', v_withdrawal.user_id,
      'bank_name', v_withdrawal.bank_name,
      'account_number', v_withdrawal.account_number,
      'admin_note', trim(p_admin_note)
    )
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 8. CẤP QUYỀN
GRANT ALL PRIVILEGES ON TABLE public.withdrawal_requests TO postgres, service_role, authenticated;
