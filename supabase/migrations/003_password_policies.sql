-- ==============================================================================
-- MIGRASI 003: Tabel password_policies (Kebijakan Password)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.password_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_length INTEGER NOT NULL DEFAULT 8,
    require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_numbers BOOLEAN NOT NULL DEFAULT TRUE,
    require_symbols BOOLEAN NOT NULL DEFAULT TRUE,
    max_age_days INTEGER NOT NULL DEFAULT 90,
    prevent_reuse_count INTEGER NOT NULL DEFAULT 5,
    lockout_attempts INTEGER NOT NULL DEFAULT 5,
    lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.password_policies (min_length, require_uppercase, require_lowercase, require_numbers, require_symbols, max_age_days, prevent_reuse_count, lockout_attempts, lockout_duration_minutes)
VALUES (8, TRUE, TRUE, TRUE, TRUE, 90, 5, 5, 30)
ON CONFLICT DO NOTHING;

ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin manage password policies" ON public.password_policies;
DROP POLICY IF EXISTS "All view active policies" ON public.password_policies;

CREATE POLICY "Superadmin manage password policies" ON public.password_policies
FOR ALL USING (public.get_current_user_role() = 'Superadmin');

CREATE POLICY "All view active policies" ON public.password_policies
FOR SELECT USING (is_active = TRUE);

-- ==============================================================================
-- AKHIR MIGRASI 003
-- ==============================================================================
