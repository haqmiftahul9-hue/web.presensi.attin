-- ==============================================================================
-- MIGRASI 001: Tabel attendance_approvals (Persetujuan Presensi Manual)
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

CREATE TABLE IF NOT EXISTS public.attendance_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id INTEGER NOT NULL,
    unit_id TEXT NOT NULL,
    requested_by INTEGER NOT NULL,
    requested_by_role TEXT NOT NULL DEFAULT 'Admin Unit',
    tanggal DATE NOT NULL,
    jam_masuk TIME,
    jam_pulang TIME,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    method TEXT NOT NULL DEFAULT 'Manual',
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_approvals_status ON public.attendance_approvals(status);
CREATE INDEX IF NOT EXISTS idx_attendance_approvals_staff_date ON public.attendance_approvals(staff_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_approvals_created ON public.attendance_approvals(created_at);

ALTER TABLE public.attendance_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin manage all approvals" ON public.attendance_approvals;
DROP POLICY IF EXISTS "Admin Unit manage own unit approvals" ON public.attendance_approvals;
DROP POLICY IF EXISTS "Staff view own approvals" ON public.attendance_approvals;

CREATE POLICY "Superadmin manage all approvals" ON public.attendance_approvals
FOR ALL USING (public.get_current_user_role() = 'Superadmin');

CREATE POLICY "Admin Unit manage own unit approvals" ON public.attendance_approvals
FOR ALL USING (
    public.get_current_user_role() = 'Admin Unit'
    AND unit_id = (SELECT current_unit_id FROM public.get_current_user_context())
);

CREATE POLICY "Staff view own approvals" ON public.attendance_approvals
FOR SELECT USING (
    staff_id = (SELECT id FROM public.get_current_user_context())
    AND public.get_current_user_role() IN ('Guru', 'Kepala Sekolah')
);

-- ==============================================================================
-- AKHIR MIGRASI 001
-- ==============================================================================
