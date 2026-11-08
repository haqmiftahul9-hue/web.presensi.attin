-- ==============================================================================
-- MIGRASI 002: Tabel two_factor_secrets (2FA)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.two_factor_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL UNIQUE,
    secret TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    backup_codes JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.two_factor_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own 2FA" ON public.two_factor_secrets;
DROP POLICY IF EXISTS "Superadmin manage all 2FA" ON public.two_factor_secrets;

CREATE POLICY "Users manage own 2FA" ON public.two_factor_secrets
FOR ALL USING (
    user_id = (SELECT id FROM public.get_current_user_context())
);

CREATE POLICY "Superadmin manage all 2FA" ON public.two_factor_secrets
FOR ALL USING (public.get_current_user_role() = 'Superadmin');

-- ==============================================================================
-- AKHIR MIGRASI 002
-- ==============================================================================
