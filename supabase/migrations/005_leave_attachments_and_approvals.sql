-- ==============================================================================
-- MIGRASI 005: Peningkatan Bukti Lampiran Surat Izin/Cuti & Approval 2-Tahap
-- ==============================================================================
-- Memastikan bukti surat pengajuan izin/cuti (PDF, JPG, PNG, WebP) yang diunggah
-- oleh Guru/Pegawai dapat diakses dan dilihat secara rapi oleh:
-- 1. Guru/Pegawai yang mengajukan (pada riwayat pengajuan izin/cuti)
-- 2. Kepala Sekolah unit terkait (pada halaman verifikasi & persetujuan izin/cuti)
-- 3. Superadmin Yayasan (pada dashboard pengajuan izin/cuti seluruh unit)
-- ==============================================================================

-- 1. Penambahan Kolom Metadata Lampiran & Approval 2-Tahap pada Tabel leaves
ALTER TABLE public.leaves 
  ADD COLUMN IF NOT EXISTS lampiran_nama TEXT,
  ADD COLUMN IF NOT EXISTS lampiran_tipe VARCHAR(100),
  ADD COLUMN IF NOT EXISTS lampiran_ukuran INTEGER,
  ADD COLUMN IF NOT EXISTS tahap_approval INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approval_kepsek JSONB DEFAULT '{"status": "Menunggu", "approverName": null, "approverRole": "Kepala Sekolah", "tanggal": null, "catatan": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_superadmin JSONB DEFAULT '{"status": "Menunggu", "approverName": null, "approverRole": "Superadmin", "tanggal": null, "catatan": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS rejected_stage VARCHAR(50);

-- Tambahkan nilai enum baru ke leave_status jika belum ada
DO $$ BEGIN
  ALTER TYPE public.leave_status ADD VALUE IF NOT EXISTS 'Menunggu Kepsek';
  ALTER TYPE public.leave_status ADD VALUE IF NOT EXISTS 'Menunggu Superadmin';
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

-- Pastikan indeks performa untuk pencarian berkas & status approval
CREATE INDEX IF NOT EXISTS idx_leaves_tahap_approval ON public.leaves(tahap_approval);
CREATE INDEX IF NOT EXISTS idx_leaves_lampiran_url ON public.leaves(lampiran_url) WHERE lampiran_url IS NOT NULL;

-- 2. Konfigurasi Bucket Supabase Storage: 'leave-attachments'
-- Bucket diset public = true agar file surat izin (PDF/Foto) dapat dipratinjau & diunduh
-- langsung di browser oleh Guru, Kepala Sekolah, dan Superadmin.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leave-attachments', 
  'leave-attachments', 
  true, 
  5242880, -- 5MB batas ukuran maksimal berkas surat dokter / dokumen lampiran
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- 3. Storage Policies (Hak Akses Berkas di storage.objects)
DROP POLICY IF EXISTS "Public Read Leave Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth Read Leave Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Leave Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anon Upload Leave Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Leave Attachments" ON storage.objects;

-- Siapa pun (Guru pemilik, Kepala Sekolah, Superadmin) dapat membaca surat lampiran via URL publik
CREATE POLICY "Public Read Leave Attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'leave-attachments');

-- Pengguna terautentikasi (Guru/Pegawai/Admin) dapat mengunggah berkas surat izin
CREATE POLICY "Auth Upload Leave Attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'leave-attachments' 
  AND auth.role() = 'authenticated'
);

-- Pengguna anonim (Mobile PWA presensi sebelum login penuh Supabase Auth) dapat mengunggah surat izin
CREATE POLICY "Anon Upload Leave Attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'leave-attachments' 
  AND auth.role() = 'anon'
);

-- Hanya Superadmin atau Admin Unit yang dapat menghapus berkas dokumen dari storage
CREATE POLICY "Admin Delete Leave Attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'leave-attachments'
  AND (public.get_current_user_role() IN ('Superadmin', 'Admin Unit'))
);

-- 4. Pembaruan Row Level Security (RLS) pada Tabel public.leaves
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cuti dibaca Superadmin, Admin Unit (unitnya), Kepala Sekolah (unitnya), atau Guru (milik sendiri)" ON public.leaves;
DROP POLICY IF EXISTS "Cuti diajukan oleh Guru/Kepala Sekolah (diri sendiri) atau Admin" ON public.leaves;
DROP POLICY IF EXISTS "Cuti disetujui/ditolak oleh Superadmin, Admin Unit, atau Kepala Sekolah (unitnya)" ON public.leaves;

-- 4.1 Hak Baca (SELECT):
-- - Superadmin: Membaca pengajuan & dokumen surat izin semua unit
-- - Kepala Sekolah & Admin Unit: Membaca pengajuan & dokumen surat izin staf di unit sekolahnya
-- - Guru / Pegawai: Membaca pengajuan & dokumen surat izin milik dirinya sendiri
-- - anon: Izin baca fallback untuk aplikasi mobile PWA presensi
CREATE POLICY "Cuti dibaca Superadmin, Admin Unit (unitnya), Kepala Sekolah (unitnya), atau Guru (milik sendiri)" 
ON public.leaves FOR SELECT USING (
  public.get_current_user_role() = 'Superadmin'
  OR (public.get_current_user_role()::text IN ('Admin Unit', 'Petugas Presensi', 'Kepala Sekolah') AND unit_id = public.get_current_user_unit())
  OR (public.get_current_user_role() = 'Guru' AND staff_id = public.get_current_staff_id())
  OR auth.uid() IS NULL
);

-- 4.2 Hak Pengajuan (INSERT):
CREATE POLICY "Cuti diajukan oleh Guru/Kepala Sekolah (diri sendiri) atau Admin" 
ON public.leaves FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('Superadmin', 'Admin Unit')
  OR (public.get_current_user_role()::text IN ('Guru', 'Kepala Sekolah') AND staff_id = public.get_current_staff_id())
  OR auth.uid() IS NULL
);

-- 4.3 Hak Persetujuan / Update (UPDATE):
-- - Superadmin & Admin Unit: Persetujuan final
-- - Kepala Sekolah: Persetujuan tahap 1 unit bersangkutan
CREATE POLICY "Cuti disetujui/ditolak oleh Superadmin, Admin Unit, atau Kepala Sekolah (unitnya)" 
ON public.leaves FOR UPDATE USING (
  public.get_current_user_role() IN ('Superadmin', 'Admin Unit')
  OR (public.get_current_user_role()::text = 'Kepala Sekolah' AND unit_id = public.get_current_user_unit())
  OR auth.uid() IS NULL
);

-- ==============================================================================
-- AKHIR MIGRASI 005
-- ==============================================================================
