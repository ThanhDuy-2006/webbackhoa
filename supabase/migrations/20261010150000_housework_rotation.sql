-- ============================================================================
-- MIGRATION: HỆ THỐNG PHÂN CÔNG DỌN NHÀ LUÂN PHIÊN THEO TUẦN (ROTATION)
-- ============================================================================

-- 1. BẢNG CẤU HÌNH LUÂN PHIÊN (housework_rotation_config)
CREATE TABLE IF NOT EXISTS public.housework_rotation_config (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  start_date DATE NOT NULL DEFAULT '2026-10-12', -- Ngày bắt đầu tính lịch luân phiên
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.housework_rotation_config (id, start_date)
VALUES ('default', '2026-10-12')
ON CONFLICT (id) DO NOTHING;

-- 2. BẢNG THÀNH VIÊN VÀ THỨ TỰ LUÂN PHIÊN (housework_rotation_members)
CREATE TABLE IF NOT EXISTS public.housework_rotation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_index INT NOT NULL, -- Thứ tự luân phiên (1, 2, 3...)
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_rotation_user UNIQUE (user_id),
  CONSTRAINT uq_rotation_order UNIQUE (order_index)
);

CREATE INDEX IF NOT EXISTS idx_rotation_members_order ON public.housework_rotation_members(order_index ASC);

-- 3. BẢNG LƯU TRẠNG THÁI ĐÃ XEM POPUP THEO TUẦN (housework_popup_acknowledgments)
CREATE TABLE IF NOT EXISTS public.housework_popup_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Ngày thứ Hai của tuần được phân công
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_popup_ack UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_popup_ack_lookup ON public.housework_popup_acknowledgments(user_id, week_start);

-- 4. CẤP QUYỀN TRUY CẬP BẢNG CHO ROLE AUTHENTICATED VÀ SERVICE_ROLE (BẮT BUỘC TRÊN SUPABASE)
GRANT ALL ON TABLE public.housework_rotation_config TO authenticated, service_role;
GRANT ALL ON TABLE public.housework_rotation_members TO authenticated, service_role;
GRANT ALL ON TABLE public.housework_popup_acknowledgments TO authenticated, service_role;

-- 5. BẢO MẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.housework_rotation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housework_rotation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housework_popup_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Config RLS
DROP POLICY IF EXISTS "Authenticated users view rotation config" ON public.housework_rotation_config;
DROP POLICY IF EXISTS "Admins manage rotation config" ON public.housework_rotation_config;

CREATE POLICY "Authenticated users view rotation config"
  ON public.housework_rotation_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage rotation config"
  ON public.housework_rotation_config
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Members RLS
DROP POLICY IF EXISTS "Authenticated users view rotation members" ON public.housework_rotation_members;
DROP POLICY IF EXISTS "Admins manage rotation members" ON public.housework_rotation_members;

CREATE POLICY "Authenticated users view rotation members"
  ON public.housework_rotation_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage rotation members"
  ON public.housework_rotation_members
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Popup Acknowledgments RLS
DROP POLICY IF EXISTS "Users can view own popup acknowledgments" ON public.housework_popup_acknowledgments;
DROP POLICY IF EXISTS "Users can acknowledge own popup" ON public.housework_popup_acknowledgments;
DROP POLICY IF EXISTS "Admins can view all popup acknowledgments" ON public.housework_popup_acknowledgments;

CREATE POLICY "Users can view own popup acknowledgments"
  ON public.housework_popup_acknowledgments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge own popup"
  ON public.housework_popup_acknowledgments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all popup acknowledgments"
  ON public.housework_popup_acknowledgments
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. LÀM MỚI SCHEMA CACHE CỦA POSTGREST / SUPABASE
NOTIFY pgrst, 'reload schema';

