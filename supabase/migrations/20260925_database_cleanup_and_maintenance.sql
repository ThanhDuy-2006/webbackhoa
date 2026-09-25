-- ==============================================================================
-- MIGRATION: HỆ THỐNG DATABASE MAINTENANCE & PRUNING SYSTEM
-- Timestamp: 20260925
-- Mô tả: Cung cấp đầy đủ cơ chế dọn dẹp dữ liệu cũ (Application Pruning), 
--        theo dõi sức khỏe PostgreSQL (Tuple & Storage Statistics),
--        lưu lịch sử bảo trì, và bảo vệ toàn vẹn lịch sử giao dịch (Soft Delete Safety).
-- ==============================================================================

-- 1. BẢNG LƯU LỊCH SỬ THỰC THI BẢO TRÌ (DATABASE MAINTENANCE RUNS)
CREATE TABLE IF NOT EXISTS public.database_maintenance_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'cron', 'api')),
  dry_run BOOLEAN NOT NULL DEFAULT false,
  log_retention_days INTEGER NOT NULL DEFAULT 180,
  batch_size INTEGER NOT NULL DEFAULT 5000,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  result JSONB DEFAULT '{}'::jsonb,
  duration_ms NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index cho lịch sử chạy bảo trì
CREATE INDEX IF NOT EXISTS idx_maintenance_runs_started_at 
ON public.database_maintenance_runs (started_at DESC);

-- 2. INDEX TỐI ƯU HÓA CHO CÁC TRUY VẤN CLEANUP (CLEANUP INDEXES)
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_cleanup ON public.notifications (created_at, is_read);
  END IF;
  IF to_regclass('public.admin_logs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_admin_logs_cleanup ON public.admin_logs (created_at);
  END IF;
  IF to_regclass('public.inventory_logs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_inventory_logs_cleanup ON public.inventory_logs (created_at);
  END IF;
  IF to_regclass('public.product_image_candidate_sessions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_candidate_sessions_cleanup ON public.product_image_candidate_sessions (expires_at);
  END IF;
  IF to_regclass('public.carts') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_carts_cleanup ON public.carts (updated_at);
  END IF;
  IF to_regclass('public.product_image_cache') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_image_cache_cleanup ON public.product_image_cache (usage_count, created_at);
  END IF;
END $$;

-- 3. HÀM LẤY THỐNG KÊ CHI TIẾT POSTGRESQL (TUPLES & STORAGE STATISTICS)
CREATE OR REPLACE FUNCTION public.get_database_maintenance_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tables_stats jsonb;
  v_total_live bigint := 0;
  v_total_dead bigint := 0;
  v_avg_dead_pct numeric := 0;
  v_total_bytes bigint := 0;
  v_tracked_count integer := 0;
  v_summary jsonb;
BEGIN
  -- Lấy thông tin thống kê từ pg_stat_user_tables và pg_class
  SELECT 
    coalesce(jsonb_agg(t_row), '[]'::jsonb)
  INTO v_tables_stats
  FROM (
    SELECT 
      st.relname AS table_name,
      coalesce(st.n_live_tup, 0) AS live_tuples,
      coalesce(st.n_dead_tup, 0) AS dead_tuples,
      CASE 
        WHEN (coalesce(st.n_live_tup, 0) + coalesce(st.n_dead_tup, 0)) > 0 
        THEN round((st.n_dead_tup::numeric / (st.n_live_tup + st.n_dead_tup)::numeric) * 100.0, 2)
        ELSE 0.00
      END AS dead_tuple_percent,
      st.last_vacuum,
      st.last_autovacuum,
      st.last_analyze,
      st.last_autoanalyze,
      pg_relation_size(st.relid) AS table_size_bytes,
      pg_indexes_size(st.relid) AS index_size_bytes,
      pg_total_relation_size(st.relid) AS total_size_bytes,
      pg_size_pretty(pg_relation_size(st.relid)) AS table_size_pretty,
      pg_size_pretty(pg_total_relation_size(st.relid)) AS total_size_pretty
    FROM pg_stat_user_tables st
    WHERE st.schemaname = 'public'
    ORDER BY pg_total_relation_size(st.relid) DESC
  ) t_row;

  -- Tính tổng quan (Summary)
  SELECT 
    count(*),
    coalesce(sum(st.n_live_tup), 0),
    coalesce(sum(st.n_dead_tup), 0),
    coalesce(sum(pg_total_relation_size(st.relid)), 0)
  INTO 
    v_tracked_count,
    v_total_live,
    v_total_dead,
    v_total_bytes
  FROM pg_stat_user_tables st
  WHERE st.schemaname = 'public';

  IF (v_total_live + v_total_dead) > 0 THEN
    v_avg_dead_pct := round((v_total_dead::numeric / (v_total_live + v_total_dead)::numeric) * 100.0, 2);
  ELSE
    v_avg_dead_pct := 0.00;
  END IF;

  v_summary := jsonb_build_object(
    'tracked_tables_count', v_tracked_count,
    'total_live_tuples', v_total_live,
    'total_dead_tuples', v_total_dead,
    'avg_dead_tuple_percent', v_avg_dead_pct,
    'total_size_bytes', v_total_bytes,
    'total_size_pretty', pg_size_pretty(v_total_bytes),
    'generated_at', now()
  );

  RETURN jsonb_build_object(
    'summary', v_summary,
    'tables', v_tables_stats
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback an toàn nếu có lỗi phân quyền pg_stat
    RETURN jsonb_build_object(
      'summary', jsonb_build_object(
        'tracked_tables_count', 0,
        'total_live_tuples', 0,
        'total_dead_tuples', 0,
        'avg_dead_tuple_percent', 0,
        'total_size_bytes', 0,
        'total_size_pretty', 'N/A',
        'generated_at', now(),
        'error', SQLERRM
      ),
      'tables', '[]'::jsonb
    );
END;
$$;

-- 4. HÀM DỌN DẸP CHÍNH (CLEAN DATABASE MAINTENANCE)
CREATE OR REPLACE FUNCTION public.clean_database_maintenance(
  p_dry_run boolean DEFAULT false,
  p_log_retention_days integer DEFAULT 180,
  p_batch_size integer DEFAULT 5000,
  p_trigger_type text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_run_id uuid;
  v_start_time timestamptz := clock_timestamp();
  v_retention_days integer;
  v_batch_limit integer;
  v_trigger text;
  v_retention_interval interval;
  v_inventory_interval interval;
  
  -- Biến đếm kết quả dọn dẹp
  v_count_candidate_sessions integer := 0;
  v_count_candidate_items integer := 0;
  v_count_abandoned_carts integer := 0;
  v_count_notifications integer := 0;
  v_count_admin_logs integer := 0;
  v_count_inventory_logs integer := 0;
  v_count_image_cache integer := 0;
  v_count_soft_products integer := 0;
  v_count_soft_categories integer := 0;
  v_count_soft_coupons integer := 0;
  v_count_soft_revenue_rules integer := 0;
  v_count_maintenance_runs integer := 0;
  
  v_total_rows integer := 0;
  v_duration_ms numeric;
  v_result jsonb;
BEGIN
  -- 1. Validate và chuẩn hóa tham số đầu vào
  v_retention_days := GREATEST(30, LEAST(COALESCE(p_log_retention_days, 180), 730));
  v_batch_limit := GREATEST(100, LEAST(COALESCE(p_batch_size, 5000), 10000));
  v_trigger := CASE WHEN p_trigger_type IN ('manual', 'cron', 'api') THEN p_trigger_type ELSE 'manual' END;
  
  v_retention_interval := (v_retention_days || ' days')::interval;
  -- Nhật ký kho luôn giữ tối thiểu 180 ngày hoặc retention được chỉ định
  v_inventory_interval := (GREATEST(v_retention_days, 180) || ' days')::interval;

  -- 2. Tạo bản ghi lịch sử chạy bảo trì (status = running)
  INSERT INTO public.database_maintenance_runs (
    trigger_type,
    dry_run,
    log_retention_days,
    batch_size,
    status
  ) VALUES (
    v_trigger,
    p_dry_run,
    v_retention_days,
    v_batch_limit,
    'running'
  ) RETURNING id INTO v_run_id;

  -- =========================================================================
  -- 3. THỰC HIỆN DỌN DẸP / TÍNH TOÁN DRY RUN (Sử dụng đồng nhất predicate)
  -- =========================================================================

  -- A. AI Candidate Sessions & Candidates (Session hết hạn > 24 giờ)
  IF to_regclass('public.product_image_candidate_sessions') IS NOT NULL AND to_regclass('public.product_image_candidates') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_candidate_items
      FROM public.product_image_candidates c
      WHERE c.session_id IN (
        SELECT s.id FROM public.product_image_candidate_sessions s
        WHERE s.expires_at < now() - interval '24 hours'
      );

      SELECT count(*) INTO v_count_candidate_sessions
      FROM public.product_image_candidate_sessions s
      WHERE s.expires_at < now() - interval '24 hours';
    ELSE
      -- Xóa candidates dựa trên session hết hạn
      WITH deleted_candidates AS (
        DELETE FROM public.product_image_candidates
        WHERE id IN (
          SELECT c.id FROM public.product_image_candidates c
          WHERE c.session_id IN (
            SELECT s.id FROM public.product_image_candidate_sessions s
            WHERE s.expires_at < now() - interval '24 hours'
          )
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_candidate_items FROM deleted_candidates;

      WITH deleted_sessions AS (
        DELETE FROM public.product_image_candidate_sessions
        WHERE id IN (
          SELECT s.id FROM public.product_image_candidate_sessions s
          WHERE s.expires_at < now() - interval '24 hours'
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_candidate_sessions FROM deleted_sessions;
    END IF;
  END IF;

  -- B. Giỏ hàng bỏ quên (Carts không cập nhật > 30 ngày)
  IF to_regclass('public.carts') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_abandoned_carts
      FROM public.carts
      WHERE updated_at < now() - interval '30 days';
    ELSE
      WITH deleted_carts AS (
        DELETE FROM public.carts
        WHERE id IN (
          SELECT id FROM public.carts
          WHERE updated_at < now() - interval '30 days'
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_abandoned_carts FROM deleted_carts;
    END IF;
  END IF;

  -- C. Notifications (Đã đọc > 45 ngày HOẶC cũ bất kể trạng thái > 120 ngày)
  -- Sử dụng đồng nhất một mệnh đề WHERE để không bao giờ bị đếm trùng
  IF to_regclass('public.notifications') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_notifications
      FROM public.notifications
      WHERE (is_read = true AND created_at < now() - interval '45 days')
         OR (created_at < now() - interval '120 days');
    ELSE
      WITH deleted_notifs AS (
        DELETE FROM public.notifications
        WHERE id IN (
          SELECT id FROM public.notifications
          WHERE (is_read = true AND created_at < now() - interval '45 days')
             OR (created_at < now() - interval '120 days')
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_notifications FROM deleted_notifs;
    END IF;
  END IF;

  -- D. Admin Logs (Cũ hơn v_retention_days ngày)
  IF to_regclass('public.admin_logs') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_admin_logs
      FROM public.admin_logs
      WHERE created_at < now() - v_retention_interval;
    ELSE
      WITH deleted_admin_logs AS (
        DELETE FROM public.admin_logs
        WHERE id IN (
          SELECT id FROM public.admin_logs
          WHERE created_at < now() - v_retention_interval
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_admin_logs FROM deleted_admin_logs;
    END IF;
  END IF;

  -- E. Inventory Logs (Cũ hơn v_inventory_interval ngày - tối thiểu 180 ngày)
  IF to_regclass('public.inventory_logs') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_inventory_logs
      FROM public.inventory_logs
      WHERE created_at < now() - v_inventory_interval;
    ELSE
      WITH deleted_inv_logs AS (
        DELETE FROM public.inventory_logs
        WHERE id IN (
          SELECT id FROM public.inventory_logs
          WHERE created_at < now() - v_inventory_interval
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_inventory_logs FROM deleted_inv_logs;
    END IF;
  END IF;

  -- F. Product Image Cache (usage_count = 0 và tạo > 60 ngày)
  IF to_regclass('public.product_image_cache') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_image_cache
      FROM public.product_image_cache
      WHERE usage_count = 0 AND created_at < now() - interval '60 days';
    ELSE
      WITH deleted_cache AS (
        DELETE FROM public.product_image_cache
        WHERE id IN (
          SELECT id FROM public.product_image_cache
          WHERE usage_count = 0 AND created_at < now() - interval '60 days'
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_image_cache FROM deleted_cache;
    END IF;
  END IF;

  -- G. SOFT DELETE SAFETY PURGE (Tuyệt đối bảo vệ dữ liệu lịch sử giao dịch)
  -- 1. Sản phẩm: CHỈ purge nếu đã soft delete > 60 ngày VÀ CHƯA TỪNG có order_item / revenue rules
  IF to_regclass('public.products') IS NOT NULL AND to_regclass('public.order_items') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_soft_products
      FROM public.products p
      WHERE p.is_deleted = true 
        AND p.deleted_at < now() - interval '60 days'
        AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.product_id = p.id)
        AND (
          to_regclass('public.product_revenue_rules') IS NULL 
          OR NOT EXISTS (SELECT 1 FROM public.product_revenue_rules prr WHERE prr.product_id = p.id)
        );
    ELSE
      WITH deleted_products AS (
        DELETE FROM public.products p
        WHERE p.id IN (
          SELECT p_sub.id FROM public.products p_sub
          WHERE p_sub.is_deleted = true 
            AND p_sub.deleted_at < now() - interval '60 days'
            AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.product_id = p_sub.id)
            AND (
              to_regclass('public.product_revenue_rules') IS NULL 
              OR NOT EXISTS (SELECT 1 FROM public.product_revenue_rules prr WHERE prr.product_id = p_sub.id)
            )
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_soft_products FROM deleted_products;
    END IF;
  END IF;

  -- 2. Mã giảm giá (Coupons): CHỈ purge nếu xóa > 60 ngày, used_count = 0 và không có đơn hàng nào áp dụng
  IF to_regclass('public.coupons') IS NOT NULL AND to_regclass('public.orders') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_soft_coupons
      FROM public.coupons c
      WHERE c.is_deleted = true 
        AND c.deleted_at < now() - interval '60 days'
        AND c.used_count = 0
        AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.note ILIKE '%' || c.code || '%');
    ELSE
      WITH deleted_coupons AS (
        DELETE FROM public.coupons c
        WHERE c.id IN (
          SELECT c_sub.id FROM public.coupons c_sub
          WHERE c_sub.is_deleted = true 
            AND c_sub.deleted_at < now() - interval '60 days'
            AND c_sub.used_count = 0
            AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.note ILIKE '%' || c_sub.code || '%')
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_soft_coupons FROM deleted_coupons;
    END IF;
  END IF;

  -- 3. Danh mục (Categories): CHỈ purge nếu xóa > 60 ngày VÀ không còn sản phẩm nào trỏ tới
  IF to_regclass('public.categories') IS NOT NULL AND to_regclass('public.products') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_soft_categories
      FROM public.categories cat
      WHERE cat.is_deleted = true 
        AND cat.deleted_at < now() - interval '60 days'
        AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = cat.id);
    ELSE
      WITH deleted_categories AS (
        DELETE FROM public.categories cat
        WHERE cat.id IN (
          SELECT cat_sub.id FROM public.categories cat_sub
          WHERE cat_sub.is_deleted = true 
            AND cat_sub.deleted_at < now() - interval '60 days'
            AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = cat_sub.id)
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_soft_categories FROM deleted_categories;
    END IF;
  END IF;

  -- 4. Luật chia tiền (Revenue Rules): CHỈ purge nếu xóa > 60 ngày, status = archived VÀ không có revenue share
  IF to_regclass('public.product_revenue_rules') IS NOT NULL AND to_regclass('public.product_revenue_shares') IS NOT NULL THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count_soft_revenue_rules
      FROM public.product_revenue_rules prr
      WHERE prr.deleted_at < now() - interval '60 days'
        AND prr.status = 'archived'
        AND NOT EXISTS (SELECT 1 FROM public.product_revenue_shares prs WHERE prs.rule_id = prr.id);
    ELSE
      WITH deleted_revenue_rules AS (
        DELETE FROM public.product_revenue_rules prr
        WHERE prr.id IN (
          SELECT prr_sub.id FROM public.product_revenue_rules prr_sub
          WHERE prr_sub.deleted_at < now() - interval '60 days'
            AND prr_sub.status = 'archived'
            AND NOT EXISTS (SELECT 1 FROM public.product_revenue_shares prs WHERE prs.rule_id = prr_sub.id)
          LIMIT v_batch_limit
        )
        RETURNING id
      )
      SELECT count(*) INTO v_count_soft_revenue_rules FROM deleted_revenue_rules;
    END IF;
  END IF;

  -- H. Dọn dẹp chính bảng Maintenance Runs (> 365 ngày để bảng không phình to)
  IF NOT p_dry_run THEN
    DELETE FROM public.database_maintenance_runs
    WHERE id IN (
      SELECT id FROM public.database_maintenance_runs
      WHERE created_at < now() - interval '365 days'
      LIMIT v_batch_limit
    );
  END IF;

  -- =========================================================================
  -- 4. TỔNG HỢP VÀ GHI NHẬN KẾT QUẢ
  -- =========================================================================
  v_total_rows := v_count_candidate_sessions 
                + v_count_candidate_items 
                + v_count_abandoned_carts 
                + v_count_notifications 
                + v_count_admin_logs 
                + v_count_inventory_logs 
                + v_count_image_cache 
                + v_count_soft_products 
                + v_count_soft_categories 
                + v_count_soft_coupons 
                + v_count_soft_revenue_rules;

  v_duration_ms := round((EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::numeric, 2);

  v_result := jsonb_build_object(
    'dry_run', p_dry_run,
    'trigger_type', v_trigger,
    'duration_ms', v_duration_ms,
    'total_rows', v_total_rows,
    'cleanup', jsonb_build_object(
      'candidate_sessions', v_count_candidate_sessions,
      'candidate_items', v_count_candidate_items,
      'abandoned_carts', v_count_abandoned_carts,
      'notifications', v_count_notifications,
      'admin_logs', v_count_admin_logs,
      'inventory_logs', v_count_inventory_logs,
      'image_cache', v_count_image_cache,
      'soft_deleted', jsonb_build_object(
        'products', v_count_soft_products,
        'categories', v_count_soft_categories,
        'coupons', v_count_soft_coupons,
        'revenue_rules', v_count_soft_revenue_rules
      )
    )
  );

  -- Cập nhật trạng thái hoàn tất vào bảng runs
  UPDATE public.database_maintenance_runs
  SET 
    completed_at = now(),
    rows_deleted = CASE WHEN p_dry_run THEN 0 ELSE v_total_rows END,
    result = v_result,
    duration_ms = v_duration_ms,
    status = 'success'
  WHERE id = v_run_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    v_duration_ms := round((EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::numeric, 2);
    
    IF v_run_id IS NOT NULL THEN
      UPDATE public.database_maintenance_runs
      SET 
        completed_at = now(),
        duration_ms = v_duration_ms,
        status = 'failed',
        error_message = SQLERRM
      WHERE id = v_run_id;
    END IF;

    RAISE EXCEPTION 'Database Maintenance Failed: %', SQLERRM;
END;
$$;

-- 5. PHÂN QUYỀN BẢO MẬT CHẶT CHẼ (SECURITY PRIVILEGES)
-- Khóa toàn bộ quyền của public/anon/authenticated để ngăn chặn truy cập ngoài ý muốn
REVOKE ALL ON TABLE public.database_maintenance_runs FROM public, anon, authenticated;
GRANT ALL ON TABLE public.database_maintenance_runs TO service_role;

REVOKE ALL ON FUNCTION public.get_database_maintenance_stats() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_database_maintenance_stats() TO service_role;

REVOKE ALL ON FUNCTION public.clean_database_maintenance(boolean, integer, integer, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clean_database_maintenance(boolean, integer, integer, text) TO service_role;
