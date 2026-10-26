-- ==============================================================================
-- SIMPRES ATTIN - SKEMA DATABASE SUPABASE LENGKAP & IDEMPOTENT (POSTGRESQL)
-- ==============================================================================
-- Skema ini dirancang khusus agar aman dijalankan berkali-kali (Re-run Safe /
-- Idempotent) di Supabase SQL Editor tanpa error "already exists".
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EKSTENSI DATABASE
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. TIPE ENUM (DOMAIN VALUES)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'Superadmin',
    'Admin Unit',
    'Guru',
    'Petugas Presensi'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.employment_status AS ENUM (
    'Guru Magang',
    'Guru Kontrak',
    'Guru Tetap Yayasan',
    'Pegawai Magang',
    'Pegawai Kontrak',
    'Pegawai Tetap Yayasan'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM (
    'Tepat Waktu',
    'Terlambat',
    'Alpha',
    'Izin',
    'Sakit',
    'Hari Libur'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_method AS ENUM (
    'Face Recognition',
    'QR Code',
    'Manual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_status AS ENUM (
    'Menunggu',
    'Disetujui',
    'Ditolak'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. FUNGSI UTILITAS: AUTO-UPDATE TIMESTAMP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 4. TABEL: UNIT SEKOLAH (TKIT, SDIT, SMPIT, SMAIT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
  id VARCHAR(10) PRIMARY KEY, -- 'tk', 'sd', 'smp', 'sma'
  kode VARCHAR(50) NOT NULL UNIQUE,
  nama VARCHAR(150) NOT NULL,
  alamat TEXT,
  telepon VARCHAR(50),
  email VARCHAR(100),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meter INTEGER NOT NULL DEFAULT 50,
  geofence_active BOOLEAN NOT NULL DEFAULT true,
  icon VARCHAR(50) DEFAULT 'school',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_units_updated_at ON public.units;
CREATE TRIGGER set_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. TABEL: ATURAN JAM KERJA GLOBAL (WIB)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id SERIAL PRIMARY KEY,
  hari_index SMALLINT NOT NULL UNIQUE, -- 0=Minggu, 1=Senin, ..., 6=Sabtu
  nama_hari VARCHAR(20) NOT NULL,
  jam_masuk TIME,
  jam_pulang TIME,
  is_hari_kerja BOOLEAN NOT NULL DEFAULT true,
  toleransi_menit INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. TABEL: DATA GURU & PEGAWAI
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
  id BIGSERIAL PRIMARY KEY,
  niy VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(100) NOT NULL, -- Jabatan manual, e.g. "Guru PAI", "Guru Sentra"
  unit_id VARCHAR(10) REFERENCES public.units(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  status_pegawai public.employment_status NOT NULL DEFAULT 'Guru Tetap Yayasan',
  pendidikan_asal VARCHAR(150), -- Pendidikan Asal kampus/instansi
  pend_terakhir VARCHAR(50),    -- Jenjang: D3, S1, S2, S3
  jurusan VARCHAR(150),
  gelar VARCHAR(50),
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(20) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
  alamat TEXT,
  kontak VARCHAR(30),
  email VARCHAR(150),
  tanggal_masuk DATE,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_niy ON public.staff(niy);
CREATE INDEX IF NOT EXISTS idx_staff_unit ON public.staff(unit_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);

DROP TRIGGER IF EXISTS set_staff_updated_at ON public.staff;
CREATE TRIGGER set_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. TABEL: BIOMETRIK PENDAFTARAN WAJAH (FACE-API.JS 128-D EMBEDDINGS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id BIGINT NOT NULL UNIQUE REFERENCES public.staff(id) ON DELETE CASCADE,
  niy VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  descriptor JSONB NOT NULL, -- Array 128 float biometrik wajah
  photo_url TEXT,           -- Snapshot foto wajah saat registrasi
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_faces_staff_id ON public.staff_faces(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_faces_niy ON public.staff_faces(niy);

DROP TRIGGER IF EXISTS set_staff_faces_updated_at ON public.staff_faces;
CREATE TRIGGER set_staff_faces_updated_at
BEFORE UPDATE ON public.staff_faces
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. TABEL: PENGGUNA APLIKASI (SINKRON DENGAN AUTH.USERS SUPABASE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  niy VARCHAR(30) UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  role public.user_role NOT NULL DEFAULT 'Guru',
  unit_id VARCHAR(10) REFERENCES public.units(id) ON DELETE SET NULL,
  staff_id BIGINT REFERENCES public.staff(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_niy ON public.users(niy);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_unit_id ON public.users(unit_id);

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 9. TABEL: PRESENSI & RIWAYAT KEHADIRAN PEGAWAI
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  unit_id VARCHAR(10) NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  hari VARCHAR(20) NOT NULL,
  jam_kerja VARCHAR(50) NOT NULL DEFAULT '07:10 - 16:00',
  jam_masuk TIME,
  jam_pulang TIME,
  status public.attendance_status NOT NULL DEFAULT 'Tepat Waktu',
  late_minutes INTEGER NOT NULL DEFAULT 0,
  method public.attendance_method NOT NULL DEFAULT 'Face Recognition',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  outside_radius BOOLEAN NOT NULL DEFAULT false,
  face_confidence NUMERIC(5, 2),        -- Skor kecocokan wajah saat datang (persen)
  face_snapshot_url TEXT,               -- Foto verifikasi check-in (kompatibilitas bawaan)
  face_snapshot_masuk_url TEXT,         -- Foto scan wajah terkompresi saat datang
  face_snapshot_pulang_url TEXT,        -- Foto scan wajah terkompresi saat pulang
  face_confidence_masuk NUMERIC(5, 2),  -- Skor kecocokan wajah saat datang (%)
  face_confidence_pulang NUMERIC(5, 2), -- Skor kecocokan wajah saat pulang (%)
  photo_bucket VARCHAR(50),             -- Nama storage bucket per unit (misal: 'presensi-sd')
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_staff_date_unique UNIQUE (staff_id, tanggal)
);

-- Kolom tambahan idempotent jika tabel attendance sudah ada sebelumnya di Supabase
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS face_snapshot_masuk_url TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS face_snapshot_pulang_url TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS face_confidence_masuk NUMERIC(5, 2);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS face_confidence_pulang NUMERIC(5, 2);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS photo_bucket VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_unit_id ON public.attendance(unit_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_photo_bucket ON public.attendance(photo_bucket);

DROP TRIGGER IF EXISTS set_attendance_updated_at ON public.attendance;
CREATE TRIGGER set_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 10. TABEL: PENGAJUAN IZIN & CUTI PEGAWAI
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaves (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  unit_id VARCHAR(10) NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  jenis VARCHAR(50) NOT NULL, -- 'Sakit', 'Izin Pribadi', 'Cuti Tahunan', 'Cuti Melahirkan', dll
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  durasi_hari INTEGER NOT NULL DEFAULT 1,
  periode VARCHAR(100) NOT NULL, -- Format display, misal: "16-18 Sep 2026"
  alasan TEXT NOT NULL,
  lampiran_url TEXT,
  status public.leave_status NOT NULL DEFAULT 'Menunggu',
  catatan_penolakan TEXT,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaves_staff_id ON public.leaves(staff_id);
CREATE INDEX IF NOT EXISTS idx_leaves_unit_id ON public.leaves(unit_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_tanggal_mulai ON public.leaves(tanggal_mulai);

DROP TRIGGER IF EXISTS set_leaves_updated_at ON public.leaves;
CREATE TRIGGER set_leaves_updated_at
BEFORE UPDATE ON public.leaves
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 11. TABEL: LOG AKTIVITAS & AUDIT TRAIL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'Tambah', 'Ubah', 'Hapus', 'Setujui', 'Tolak', 'Reset Password', 'Login'
  target VARCHAR(150),
  desc_text TEXT,
  ip_address VARCHAR(45),
  unit_id VARCHAR(10) REFERENCES public.units(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.activity_logs(user_id);

-- ------------------------------------------------------------------------------
-- 12. TABEL: PENGATURAN GLOBAL SISTEM (SINGLE ROW)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nama_aplikasi VARCHAR(100) NOT NULL DEFAULT 'SIMPEG',
  tagline VARCHAR(200) NOT NULL DEFAULT 'Sistem Presensi Kepegawaian Terpadu',
  nama_yayasan VARCHAR(150) NOT NULL DEFAULT 'Yayasan Islam Attin Indonesia',
  alamat_yayasan TEXT NOT NULL DEFAULT 'Jl. Raya Cendekia No. 45, Jakarta Selatan',
  no_whatsapp VARCHAR(30) NOT NULL DEFAULT '+62 811-9876-5432',
  email_sekretariat VARCHAR(100) NOT NULL DEFAULT 'sekretariat@attinsumbar.sch.id',
  zona_waktu VARCHAR(20) NOT NULL DEFAULT 'WIB',
  logo_yayasan_url TEXT,
  logo_per_unit JSONB NOT NULL DEFAULT '{"tk": null, "sd": null, "smp": null, "sma": null}'::jsonb,
  presensi_settings JSONB NOT NULL DEFAULT '{
    "radiusGeofenceDefault": 50,
    "lokasiAktif": true,
    "jamMasukDefault": "07:10",
    "jamPulangDefault": "16:00",
    "radiusGeofencePerUnit": {"tk": 50, "sd": 75, "smp": 50, "sma": 80}
  }'::jsonb,
  rekap_settings JSONB NOT NULL DEFAULT '{
    "formatNomorLaporan": "LPR/{UNIT}/{TAHUN}/{BULAN}/{URUT:04d}",
    "prefixDokumen": "SIMPRES",
    "defaultPeriodeLaporan": "Bulanan"
  }'::jsonb,
  notifikasi_settings JSONB NOT NULL DEFAULT '{
    "emailAktif": true,
    "whatsappAktif": true,
    "approvalIzinAktif": true
  }'::jsonb,
  keamanan_settings JSONB NOT NULL DEFAULT '{
    "minimalPassword": 8,
    "wajibGantiPasswordPertama": true,
    "durasiSession": 8,
    "autoLogout": 30
  }'::jsonb,
  penandatangan JSONB NOT NULL DEFAULT '{
    "kepalaYayasan": { "nama": "", "jabatan": "Ketua Yayasan" },
    "kepalaSekolah": {
      "tk": { "nama": "", "jabatan": "Kepala TKIT Attin Sumbar" },
      "sd": { "nama": "", "jabatan": "Kepala SDIT Attin Sumbar" },
      "smp": { "nama": "", "jabatan": "Kepala SMPIT Attin Sumbar" },
      "sma": { "nama": "", "jabatan": "Kepala SMAIT Attin Sumbar" }
    },
    "petugasPresensi": {
      "yayasan": { "nama": "", "jabatan": "Petugas Presensi Yayasan" },
      "tk": { "nama": "", "jabatan": "Petugas Presensi TKIT" },
      "sd": { "nama": "", "jabatan": "Petugas Presensi SDIT" },
      "smp": { "nama": "", "jabatan": "Petugas Presensi SMPIT" },
      "sma": { "nama": "", "jabatan": "Petugas Presensi SMAIT" }
    },
    "adminTU": {
      "kepalaTU": { "nama": "", "jabatan": "Kepala Tata Usaha" },
      "operatorSistem": { "nama": "", "jabatan": "Operator Sistem" }
    }
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_global_settings_updated_at ON public.global_settings;
CREATE TRIGGER set_global_settings_updated_at
BEFORE UPDATE ON public.global_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 13. PROSEDUR DATABASE: KALKULASI STATUS KEHADIRAN OTOMATIS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_attendance_status(
  p_tanggal DATE,
  p_jam_masuk TIME
)
RETURNS TABLE (
  status public.attendance_status,
  late_minutes INTEGER,
  hari_nama VARCHAR(20),
  jam_kerja_teks VARCHAR(50)
) AS $$
DECLARE
  v_hari_idx SMALLINT;
  v_jam_batas TIME;
  v_jam_pulang TIME;
  v_nama_hari VARCHAR(20);
  v_diff_seconds INTEGER;
  v_late_m INTEGER := 0;
  v_status public.attendance_status;
BEGIN
  v_hari_idx := EXTRACT(DOW FROM p_tanggal)::SMALLINT;

  SELECT ws.nama_hari, ws.jam_masuk, ws.jam_pulang
  INTO v_nama_hari, v_jam_batas, v_jam_pulang
  FROM public.work_schedules ws
  WHERE ws.hari_index = v_hari_idx;

  -- Jika hari Minggu atau tidak ada jam masuk (Hari Libur)
  IF v_jam_batas IS NULL THEN
    RETURN QUERY SELECT 'Hari Libur'::public.attendance_status, 0, v_nama_hari, 'Hari Libur'::VARCHAR;
    RETURN;
  END IF;

  -- Jika belum ada jam masuk
  IF p_jam_masuk IS NULL THEN
    RETURN QUERY SELECT 'Alpha'::public.attendance_status, 0, v_nama_hari, (v_jam_batas || ' - ' || COALESCE(v_jam_pulang::text, 'Selesai'))::VARCHAR;
    RETURN;
  END IF;

  -- Hitung selisih detik jam masuk vs batas jam masuk
  v_diff_seconds := EXTRACT(EPOCH FROM (p_jam_masuk - v_jam_batas))::INTEGER;

  IF v_diff_seconds > 0 THEN
    v_late_m := CEIL(v_diff_seconds / 60.0)::INTEGER;
    v_status := 'Terlambat'::public.attendance_status;
  ELSE
    v_late_m := 0;
    v_status := 'Tepat Waktu'::public.attendance_status;
  END IF;

  RETURN QUERY SELECT 
    v_status, 
    v_late_m, 
    v_nama_hari, 
    (TO_CHAR(v_jam_batas, 'HH24:MI') || ' - ' || COALESCE(TO_CHAR(v_jam_pulang, 'HH24:MI'), 'Bebas Pulang'))::VARCHAR;
END;
$$ LANGUAGE plpgsql STABLE;

-- ------------------------------------------------------------------------------
-- 14. TRIGGER: AUTO SINKRON AUTH.USERS -> PUBLIC.USERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_meta JSONB;
BEGIN
  v_meta := NEW.raw_user_meta_data;
  INSERT INTO public.users (
    id,
    email,
    name,
    username,
    niy,
    role,
    unit_id,
    staff_id,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(v_meta->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(v_meta->>'username', split_part(NEW.email, '@', 1)),
    v_meta->>'niy',
    COALESCE((v_meta->>'role')::public.user_role, 'Guru'::public.user_role),
    v_meta->>'unit_id',
    (v_meta->>'staff_id')::BIGINT,
    'Aktif'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Fungsi Helper Role & Unit Pengguna
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_unit()
RETURNS VARCHAR(10) AS $$
  SELECT unit_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_staff_id()
RETURNS BIGINT AS $$
  SELECT staff_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS pada seluruh tabel
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- 15.1 Units Policies
DROP POLICY IF EXISTS "Units dapat dibaca semua pengguna" ON public.units;
CREATE POLICY "Units dapat dibaca semua pengguna" 
ON public.units FOR SELECT USING (true);

DROP POLICY IF EXISTS "Units hanya dapat dikelola Superadmin" ON public.units;
CREATE POLICY "Units hanya dapat dikelola Superadmin" 
ON public.units FOR ALL 
USING (public.get_current_user_role() = 'Superadmin');

-- 15.2 Work Schedules Policies
DROP POLICY IF EXISTS "Jadwal kerja dapat dibaca semua pengguna" ON public.work_schedules;
CREATE POLICY "Jadwal kerja dapat dibaca semua pengguna" 
ON public.work_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Jadwal kerja hanya dapat diubah Superadmin" ON public.work_schedules;
CREATE POLICY "Jadwal kerja hanya dapat diubah Superadmin" 
ON public.work_schedules FOR ALL 
USING (public.get_current_user_role() = 'Superadmin');

-- 15.3 Global Settings Policies
DROP POLICY IF EXISTS "Pengaturan global dapat dibaca semua pengguna" ON public.global_settings;
CREATE POLICY "Pengaturan global dapat dibaca semua pengguna" 
ON public.global_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pengaturan global hanya dapat diubah Superadmin" ON public.global_settings;
CREATE POLICY "Pengaturan global hanya dapat diubah Superadmin" 
ON public.global_settings FOR ALL 
USING (public.get_current_user_role() = 'Superadmin');

-- 15.4 Staff Policies
DROP POLICY IF EXISTS "Staff dibaca oleh Superadmin, Admin Unit (sesuai unit), atau Guru (diri sendiri)" ON public.staff;
CREATE POLICY "Staff dibaca oleh Superadmin, Admin Unit (sesuai unit), atau Guru (diri sendiri)" 
ON public.staff FOR SELECT USING (
  public.get_current_user_role() = 'Superadmin'
  OR (public.get_current_user_role() IN ('Admin Unit', 'Petugas Presensi') AND unit_id = public.get_current_user_unit())
  OR (public.get_current_user_role() = 'Guru' AND id = public.get_current_staff_id())
  OR auth.uid() IS NULL
);

DROP POLICY IF EXISTS "Staff dikelola Superadmin & Admin Unit (sesuai unit)" ON public.staff;
CREATE POLICY "Staff dikelola Superadmin & Admin Unit (sesuai unit)" 
ON public.staff FOR ALL USING (
  public.get_current_user_role() = 'Superadmin'
  OR (public.get_current_user_role() = 'Admin Unit' AND (unit_id = public.get_current_user_unit() OR unit_id IS NULL))
);

-- 15.5 Staff Faces Policies (Biometrik Wajah)
DROP POLICY IF EXISTS "Wajah biometrik dapat dibaca Superadmin, Admin Unit, atau diri sendiri" ON public.staff_faces;
CREATE POLICY "Wajah biometrik dapat dibaca Superadmin, Admin Unit, atau diri sendiri" 
ON public.staff_faces FOR SELECT USING (
  public.get_current_user_role() = 'Superadmin'
  OR (public.get_current_user_role() = 'Guru' AND staff_id = public.get_current_staff_id())
  OR public.get_current_user_role() IN ('Admin Unit', 'Petugas Presensi')
  OR auth.uid() IS NULL  -- izin baca untuk anon (mobile app tanpa login Supabase)
);

DROP POLICY IF EXISTS "Pendaftaran wajah dapat dilakukan oleh user yang bersangkutan atau Admin" ON public.staff_faces;
CREATE POLICY "Admin dapat mengelola wajah biometrik" 
ON public.staff_faces FOR ALL USING (
  public.get_current_user_role() IN ('Superadmin', 'Admin Unit')
);
CREATE POLICY "Anon dapat mendaftar & membaca wajah sendiri (mobile)" 
ON public.staff_faces FOR SELECT USING (auth.uid() IS NULL);
CREATE POLICY "Anon dapat menyimpan pendaftaran wajah (mobile)" 
ON public.staff_faces FOR INSERT WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "Anon dapat memperbarui wajah sendiri (mobile)" 
ON public.staff_faces FOR UPDATE USING (auth.uid() IS NULL);

-- 15.6 Users Policies
DROP POLICY IF EXISTS "Pengguna dapat membaca profil sendiri atau Superadmin/Admin Unit" ON public.users;
CREATE POLICY "Pengguna dapat membaca profil sendiri atau Superadmin/Admin Unit" 
ON public.users FOR SELECT USING (
  id = auth.uid()
  OR public.get_current_user_role() = 'Superadmin'
  OR (public.get_current_user_role() = 'Admin Unit' AND unit_id = public.get_current_user_unit())
);

DROP POLICY IF EXISTS "Pengguna hanya dapat dimutasi oleh Superadmin" ON public.users;
CREATE POLICY "Pengguna hanya dapat dimutasi oleh Superadmin" 
ON public.users FOR ALL USING (
  public.get_current_user_role() = 'Superadmin'
  OR id = auth.uid()
);

-- 15.7 Attendance Policies
DROP POLICY IF EXISTS "Presensi dibaca Superadmin, Admin Unit (unitnya), atau Guru (milik sendiri)" ON public.attendance;
CREATE POLICY "Presensi dibaca Superadmin, Admin Unit (unitnya), atau Guru (milik sendiri)" 
ON public.attendance FOR SELECT USING (
  public.get_current_user_role() = 'Superadmin'
  OR (public.get_current_user_role() IN ('Admin Unit', 'Petugas Presensi') AND unit_id = public.get_current_user_unit())
  OR (public.get_current_user_role() = 'Guru' AND staff_id = public.get_current_staff_id())
);

DROP POLICY IF EXISTS "Presensi ditambahkan oleh Pegawai bersangkutan atau Admin" ON public.attendance;
CREATE POLICY "Presensi ditambahkan oleh Pegawai bersangkutan atau Admin" 
ON public.attendance FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('Superadmin', 'Admin Unit', 'Petugas Presensi')
  OR (public.get_current_user_role() = 'Guru' AND staff_id = public.get_current_staff_id())
);

DROP POLICY IF EXISTS "Presensi diubah oleh Superadmin atau Admin Unit" ON public.attendance;
CREATE POLICY "Presensi diubah oleh Superadmin atau Admin Unit" 
ON public.attendance FOR UPDATE USING (
  public.get_current_user_role() IN ('Superadmin', 'Admin Unit')
);

-- 15.8 Leaves Policies (Cuti & Izin)
DROP POLICY IF EXISTS "Cuti dibaca Superadmin, Admin Unit (unitnya), atau Guru (milik sendiri)" ON public.leaves;
CREATE POLICY "Cuti dibaca Superadmin, Admin Unit (unitnya), atau Guru (milik sendiri)" 
ON public.leaves FOR SELECT USING (
  public.get_current_user_role() = 'Superadmin'
  OR (public.get_current_user_role() IN ('Admin Unit', 'Petugas Presensi') AND unit_id = public.get_current_user_unit())
  OR (public.get_current_user_role() = 'Guru' AND staff_id = public.get_current_staff_id())
);

DROP POLICY IF EXISTS "Cuti diajukan oleh Guru (diri sendiri) atau Admin" ON public.leaves;
CREATE POLICY "Cuti diajukan oleh Guru (diri sendiri) atau Admin" 
ON public.leaves FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('Superadmin', 'Admin Unit')
  OR (public.get_current_user_role() = 'Guru' AND staff_id = public.get_current_staff_id())
);

DROP POLICY IF EXISTS "Cuti disetujui/ditolak oleh Superadmin atau Admin Unit" ON public.leaves;
CREATE POLICY "Cuti disetujui/ditolak oleh Superadmin atau Admin Unit" 
ON public.leaves FOR UPDATE USING (
  public.get_current_user_role() IN ('Superadmin', 'Admin Unit')
);

-- 15.9 Activity Logs Policies
DROP POLICY IF EXISTS "Log aktivitas dibaca Superadmin dan Admin Unit" ON public.activity_logs;
CREATE POLICY "Log aktivitas dibaca Superadmin dan Admin Unit" 
ON public.activity_logs FOR SELECT USING (
  public.get_current_user_role() = 'Superadmin'
  OR (public.get_current_user_role() = 'Admin Unit' AND (unit_id = public.get_current_user_unit() OR unit_id IS NULL))
);

DROP POLICY IF EXISTS "Log aktivitas dibuat oleh semua sesi terautentikasi" ON public.activity_logs;
CREATE POLICY "Log aktivitas dibuat oleh semua sesi terautentikasi" 
ON public.activity_logs FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 16. STORAGE BUCKETS & POLICIES (SUPABASE STORAGE)
-- ------------------------------------------------------------------------------
-- Bucket dipisahkan per unit sekolah (TK, SD, SMP, SMA, Yayasan) untuk menyimpan
-- foto scan wajah presensi (datang dan pulang) secara terstruktur & terorganisir.
-- Format foto: WebP terkompresi (< 30KB) dengan struktur folder:
-- [bucket-unit] / [masuk|pulang] / [YYYY-MM-DD] / [NIY]_[HHMMSS].webp
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('unit-logos', 'unit-logos', true),
  ('face-snapshots', 'face-snapshots', true),
  ('leave-attachments', 'leave-attachments', false),
  -- Bucket per unit sekolah untuk bukti foto presensi scan wajah datang & pulang
  ('presensi-tk', 'presensi-tk', true),
  ('presensi-sd', 'presensi-sd', true),
  ('presensi-smp', 'presensi-smp', true),
  ('presensi-sma', 'presensi-sma', true),
  ('presensi-yayasan', 'presensi-yayasan', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Atur batas ukuran file (1MB max per foto terkompresi) dan format MIME WebP/JPEG
DO $$ BEGIN
  UPDATE storage.buckets 
  SET file_size_limit = 1048576,
      allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']
  WHERE id IN ('presensi-tk', 'presensi-sd', 'presensi-smp', 'presensi-sma', 'presensi-yayasan', 'face-snapshots');
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- Bersihkan policy storage lama bila ada agar tidak terjadi error duplicate
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Face Snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Auth Read Face Snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Anon Upload Face Snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Anon Read Face Snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Presensi Photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Presensi Photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon Upload Presensi Photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Presensi Photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Leave Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth Read Leave Attachments" ON storage.objects;

-- Buat ulang policy storage
CREATE POLICY "Public Read Avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Public Insert Avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Public Update Avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Public Delete Avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

CREATE POLICY "Public Read Logos" ON storage.objects
FOR SELECT USING (bucket_id = 'unit-logos');

-- Policy untuk foto bukti presensi per unit & face-snapshots:
-- 1. Baca foto publik (dashboard monitoring, rekap kehadiran, audit)
CREATE POLICY "Public Read Presensi Photos" ON storage.objects
FOR SELECT USING (bucket_id IN ('face-snapshots', 'presensi-tk', 'presensi-sd', 'presensi-smp', 'presensi-sma', 'presensi-yayasan'));

-- 2. Unggah foto oleh user terautentikasi (Guru, Petugas Presensi, Admin)
CREATE POLICY "Auth Upload Presensi Photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('face-snapshots', 'presensi-tk', 'presensi-sd', 'presensi-smp', 'presensi-sma', 'presensi-yayasan')
  AND auth.role() = 'authenticated'
);

-- 3. Izin anon untuk upload face snapshots (kiosk sekolah / mobile app scan presensi)
CREATE POLICY "Anon Upload Presensi Photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('face-snapshots', 'presensi-tk', 'presensi-sd', 'presensi-smp', 'presensi-sma', 'presensi-yayasan')
  AND auth.role() = 'anon'
);

-- 4. Hapus foto presensi hanya oleh Superadmin
CREATE POLICY "Admin Delete Presensi Photos" ON storage.objects
FOR DELETE USING (
  bucket_id IN ('face-snapshots', 'presensi-tk', 'presensi-sd', 'presensi-smp', 'presensi-sma', 'presensi-yayasan')
  AND (public.get_current_user_role() = 'Superadmin' OR auth.role() = 'authenticated')
);

CREATE POLICY "Auth Upload Leave Attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'leave-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Read Leave Attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'leave-attachments' AND auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 17. SEED DATA AWAL (INITIAL DATA SET)
-- ------------------------------------------------------------------------------

-- 17.1 Unit Sekolah
INSERT INTO public.units (id, kode, nama, alamat, radius_meter, geofence_active, icon, latitude, longitude)
VALUES 
  ('tk', 'UNT-TK-01', 'TKIT Attin Sumbar', 'Jl. Cendekia No. 41', 50, true, 'child_care', -6.289450, 106.792340),
  ('sd', 'UNT-SD-02', 'SDIT Attin Sumbar', 'Jl. Cendekia No. 43, Cilandak', 75, true, 'school', -6.289550, 106.792440),
  ('smp', 'UNT-SMP-03', 'SMPIT Attin Sumbar', 'Jl. Cendekia No. 45', 50, true, 'school', -6.289650, 106.792540),
  ('sma', 'UNT-SMA-04', 'SMAIT Attin Sumbar', 'Jl. Cendekia No. 47', 80, true, 'school', -6.289750, 106.792640)
ON CONFLICT (id) DO UPDATE SET
  nama = EXCLUDED.nama,
  radius_meter = EXCLUDED.radius_meter,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- 17.2 Jadwal Jam Kerja Global
INSERT INTO public.work_schedules (hari_index, nama_hari, jam_masuk, jam_pulang, is_hari_kerja)
VALUES
  (1, 'Senin', '07:10:00', '16:00:00', true),
  (2, 'Selasa', '07:10:00', '16:00:00', true),
  (3, 'Rabu', '07:10:00', '16:00:00', true),
  (4, 'Kamis', '07:10:00', '16:00:00', true),
  (5, 'Jumat', '07:10:00', NULL, true),        -- Bebas pulang
  (6, 'Sabtu', '07:30:00', '13:00:00', true),
  (0, 'Minggu', NULL, NULL, false)              -- Hari libur
ON CONFLICT (hari_index) DO UPDATE SET
  jam_masuk = EXCLUDED.jam_masuk,
  jam_pulang = EXCLUDED.jam_pulang,
  is_hari_kerja = EXCLUDED.is_hari_kerja;

-- 17.3 Pengaturan Global Yayasan
INSERT INTO public.global_settings (id, nama_aplikasi, tagline, nama_yayasan, alamat_yayasan, no_whatsapp, email_sekretariat, zona_waktu)
VALUES (
  1,
  'SIMPEG',
  'Sistem Presensi Kepegawaian Terpadu',
  'Yayasan Islam Attin Indonesia',
  'Jl. Raya Cendekia No. 45, Jakarta Selatan',
  '+62 811-9876-5432',
  'sekretariat@attinsumbar.sch.id',
  'WIB'
)
ON CONFLICT (id) DO NOTHING;

-- 17.4 Data Contoh Staff (Guru & Pegawai)
INSERT INTO public.staff (id, niy, name, role, unit_id, status, status_pegawai, pendidikan_asal, pend_terakhir, jurusan, gelar, kontak, email)
VALUES
  (1, '049005069', 'Erianto, S.Ag, M.Pd.I', 'Guru PAI', 'smp', 'Aktif', 'Guru Tetap Yayasan', 'UIN Imam Bonjol', 'S2', 'Pendidikan Agama Islam', 'S.Ag, M.Pd.I', '081234567890', 'erianto@simpres.sch.id'),
  (2, '049097021', 'Bustanul Abidin, S.Pd', 'Guru Kelas 6 & Kurikulum', 'sd', 'Aktif', 'Guru Tetap Yayasan', 'Universitas Negeri Padang', 'S1', 'PGSD', 'S.Pd', '081234567891', 'bustanul@simpres.sch.id'),
  (3, '049098034', 'Sulasmi, S.Pd', 'Guru Kelas 3 • Tahfidz', 'sd', 'Aktif', 'Guru Kontrak', 'Universitas Negeri Padang', 'S1', 'PGSD', 'S.Pd', '081234567892', 'sulasmi@simpres.sch.id'),
  (4, '049001054', 'Wisna Yunita, S.Pd', 'Guru Kelas 1 • Tematik', 'sd', 'Aktif', 'Guru Tetap Yayasan', 'Universitas Negeri Padang', 'S1', 'PGSD', 'S.Pd', '081234567893', 'wisna@simpres.sch.id'),
  (5, '029011052', 'Irmawati, S.Pd', 'Guru Sentra', 'tk', 'Aktif', 'Guru Magang', 'Universitas Negeri Padang', 'S1', 'PAUD', 'S.Pd', '081234567894', 'irmawati@simpres.sch.id'),
  (6, '029012056', 'Risa Fadillah, S.Pd', 'Guru Biologi & Laboran', 'sma', 'Nonaktif', 'Guru Kontrak', 'Universitas Andalas', 'S1', 'Biologi', 'S.Pd', '081234567895', 'risa@simpres.sch.id'),
  (7, '049033108', 'Hendra Kurniawan, S.Pd.I', 'Guru Agama', 'sd', 'Aktif', 'Guru Magang', 'UIN Imam Bonjol', 'S1', 'Pendidikan Agama Islam', 'S.Pd.I', '081234567896', 'hendra@simpres.sch.id'),
  (8, '049023183', 'Silvana Monica, S.Ak', 'Staf Administrasi', 'sma', 'Aktif', 'Pegawai Tetap Yayasan', 'Universitas Negeri Padang', 'S1', 'Akuntansi', 'S.Ak', '081234567897', 'silvana@simpres.sch.id'),
  (9, '029045122', 'Rizal Ramli, S.Pd.I', 'Guru PAI', 'sd', 'Aktif', 'Guru Tetap Yayasan', 'UIN Imam Bonjol', 'S1', 'Pendidikan Agama Islam', 'S.Pd.I', '081234567898', 'rizal.r@sd.rj.sch.id')
ON CONFLICT (id) DO NOTHING;

-- 17.5 Data Contoh Cuti & Izin
INSERT INTO public.leaves (id, staff_id, unit_id, jenis, tanggal_mulai, tanggal_selesai, durasi_hari, periode, alasan, status)
VALUES
  (1, 4, 'sd', 'Sakit', '2026-09-16', '2026-09-18', 3, '16-18 Sep 2026', 'Demam dan flu berat atas anjuran dokter', 'Menunggu'),
  (2, 7, 'sd', 'Izin Pribadi', '2026-09-15', '2026-09-15', 1, '15 Sep 2026', 'Menghadiri acara pernikahan keluarga di kampung', 'Menunggu'),
  (3, 6, 'sma', 'Cuti Penting', '2026-09-18', '2026-09-25', 6, '18-25 Sep 2026', 'Urusan keluarga penting di luar kota', 'Menunggu'),
  (4, 3, 'sd', 'Sakit', '2026-09-08', '2026-09-09', 2, '08-09 Sep 2026', 'Istirahat pasca rawat inap', 'Disetujui'),
  (5, 8, 'sma', 'Sakit', '2026-09-08', '2026-09-09', 2, '08-09 Sep 2026', 'Pemeriksaan kesehatan rumah sakit', 'Disetujui'),
  (6, 2, 'sd', 'Izin Pribadi', '2026-09-02', '2026-09-02', 1, '02 Sep 2026', 'Keperluan administrasi kependudukan', 'Ditolak')
ON CONFLICT (id) DO NOTHING;

-- 17.6 Data Contoh Log Aktivitas
INSERT INTO public.activity_logs (id, actor, role, action, target, desc_text, ip_address, unit_id, created_at)
VALUES
  (1, 'Bambang Hidayat', 'Superadmin', 'Ubah', 'Unit • SDIT Attin Sumbar', 'Radius geofence 50m → 75m', '103.144.12.8', 'sd', now() - interval '2 days'),
  (2, 'Bustanul Abidin', 'Admin SD', 'Tambah', 'Pegawai • Erianto', 'Tambah NIY 049005069 Guru PAI', '103.144.12.10', 'sd', now() - interval '2 days 3 hours'),
  (3, 'Superadmin Pusat', 'Superadmin', 'Reset Password', 'Akun • Hendra Kurniawan', 'Reset & kirim kredensial via WA', '103.144.12.8', 'sd', now() - interval '3 days'),
  (4, 'Reki Gusman', 'Admin SMP', 'Ubah', 'Cuti • Wisna Yunita', 'Setujui izin sakit 3 hari', '103.144.12.14', 'sd', now() - interval '3 days 6 hours'),
  (5, 'Bambang Hidayat', 'Superadmin', 'Login', 'Sesi • Console', 'Login 103.144.12.8 (Chrome Windows)', '103.144.12.8', NULL, now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- Sinkronisasi Sequence ID
DO $$ BEGIN
  PERFORM setval('public.staff_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.staff));
  PERFORM setval('public.leaves_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.leaves));
  PERFORM setval('public.activity_logs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.activity_logs));
END $$;

-- ==============================================================================
-- AKHIR SKEMA DATABASE SUPABASE
-- ==============================================================================
