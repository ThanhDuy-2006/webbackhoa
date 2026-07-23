-- Migration: Smart Product Image Candidate Sessions

CREATE TABLE IF NOT EXISTS public.product_image_candidate_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    product_id uuid NULL REFERENCES public.products(id) ON DELETE CASCADE,
    form_session_id text NULL,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_image_candidates (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id uuid NOT NULL REFERENCES public.product_image_candidate_sessions(id) ON DELETE CASCADE,
    url text NOT NULL,
    thumbnail_url text NOT NULL,
    metadata_score integer NOT NULL,
    visual_score integer NULL,
    photographer text NULL,
    source_page_url text NULL
);

-- Enable RLS
ALTER TABLE public.product_image_candidate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_image_candidates ENABLE ROW LEVEL SECURITY;

-- Admin access policies
CREATE POLICY "Only admins can manage candidate sessions" ON public.product_image_candidate_sessions
    FOR ALL TO authenticated
    USING ( (auth.jwt() ->> 'role' = 'admin') OR (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')) );

CREATE POLICY "Only admins can manage candidates" ON public.product_image_candidates
    FOR ALL TO authenticated
    USING ( (auth.jwt() ->> 'role' = 'admin') OR (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')) );

-- Index for session queries and cleanup
CREATE INDEX IF NOT EXISTS idx_candidate_sessions_admin ON public.product_image_candidate_sessions(admin_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_candidate_sessions_product ON public.product_image_candidate_sessions(product_id);
CREATE INDEX IF NOT EXISTS idx_candidate_sessions_form ON public.product_image_candidate_sessions(form_session_id);
