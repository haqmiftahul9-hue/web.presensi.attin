-- ==============================================================================
-- MIGRASI 004: Tabel push_subscriptions + Fungsi get_current_user_context + RLS attendance
-- ==============================================================================

-- Fungsi get_current_user_context untuk RLS (harus dibuat sebelum policy)
CREATE OR REPLACE FUNCTION public.get_current_user_context()
RETURNS TABLE (
    id INTEGER,
    role TEXT,
    unit_id TEXT,
    current_unit_id TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.role,
        s.unit_id,
        COALESCE(s.current_unit_id, s.unit_id)
    FROM public.staff s
    WHERE s.id = auth.uid()::INTEGER;
END $$;

-- 4.1 push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_info TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Superadmin manage all push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
FOR ALL USING (
    user_id = (SELECT id FROM public.get_current_user_context())
);

CREATE POLICY "Superadmin manage all push subscriptions" ON public.push_subscriptions
FOR ALL USING (public.get_current_user_role() = 'Superadmin');

-- 4.3 Update RLS pada tabel attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admin Unit manage own unit attendance" ON public.attendance;
DROP POLICY IF EXISTS "Superadmin manage all attendance" ON public.attendance;

CREATE POLICY "Staff view own attendance" ON public.attendance
FOR SELECT USING (
    staff_id = (SELECT id FROM public.get_current_user_context())
);

CREATE POLICY "Admin Unit manage own unit attendance" ON public.attendance
FOR ALL USING (
    public.get_current_user_role() = 'Admin Unit'
    AND unit_id = (SELECT current_unit_id FROM public.get_current_user_context())
);

CREATE POLICY "Superadmin manage all attendance" ON public.attendance
FOR ALL USING (public.get_current_user_role() = 'Superadmin');

-- ==============================================================================
-- AKHIR MIGRASI 004
-- ==============================================================================
