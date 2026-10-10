-- ============================================================================
-- MIGRATION: BẢNG PHÂN CÔNG DỌN NHÀ (HOUSEWORK TASKS & SETTINGS)
-- ============================================================================

-- 1. BẢNG CÔNG VIỆC DỌN NHÀ (housework_tasks)
CREATE TABLE IF NOT EXISTS public.housework_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  task_date DATE NOT NULL,
  week_start DATE NOT NULL, -- Luôn là ngày thứ Hai của tuần
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger cập nhật updated_at
CREATE OR REPLACE TRIGGER set_housework_tasks_updated_at 
BEFORE UPDATE ON public.housework_tasks 
FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- Chỉ mục tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_housework_tasks_week_start ON public.housework_tasks(week_start, task_date);
CREATE INDEX IF NOT EXISTS idx_housework_tasks_assigned_to ON public.housework_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_housework_tasks_status ON public.housework_tasks(status);
CREATE INDEX IF NOT EXISTS idx_housework_tasks_task_date ON public.housework_tasks(task_date);

-- 2. BẢNG CÀI ĐẶT XOAY VÒNG PHÂN CÔNG (housework_settings)
CREATE TABLE IF NOT EXISTS public.housework_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  auto_rotate BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Chèn cấu hình mặc định (tắt tự động xoay vòng)
INSERT INTO public.housework_settings (id, auto_rotate)
VALUES ('default', false)
ON CONFLICT (id) DO NOTHING;

-- 3. BẢO MẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.housework_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housework_settings ENABLE ROW LEVEL SECURITY;

-- Xóa policy cũ nếu có
DROP POLICY IF EXISTS "Authenticated users can view housework tasks" ON public.housework_tasks;
DROP POLICY IF EXISTS "Admins can insert housework tasks" ON public.housework_tasks;
DROP POLICY IF EXISTS "Admins can update housework tasks" ON public.housework_tasks;
DROP POLICY IF EXISTS "Users can update own housework tasks" ON public.housework_tasks;
DROP POLICY IF EXISTS "Admins can delete housework tasks" ON public.housework_tasks;

-- Policy cho housework_tasks
CREATE POLICY "Authenticated users can view housework tasks"
  ON public.housework_tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert housework tasks"
  ON public.housework_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update housework tasks"
  ON public.housework_tasks
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own housework tasks"
  ON public.housework_tasks
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Admins can delete housework tasks"
  ON public.housework_tasks
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policy cho housework_settings
DROP POLICY IF EXISTS "Authenticated users can view housework settings" ON public.housework_settings;
DROP POLICY IF EXISTS "Admins can update housework settings" ON public.housework_settings;

CREATE POLICY "Authenticated users can view housework settings"
  ON public.housework_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update housework settings"
  ON public.housework_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
