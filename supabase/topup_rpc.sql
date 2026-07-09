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
