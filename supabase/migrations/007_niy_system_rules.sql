-- ==============================================================================
-- MIGRATION 007: STANDARISASI FORMAT NIY YAYASAN (9 DIGIT)
-- ==============================================================================
-- Format NIY:
--   [Kode Unit (2)] + [Tahun Yayasan (17)] + [Tahun Masuk (2)] + [No Urut (3)]
--   Contoh: 011722012
--     01  = Unit TK (TKIT)
--     17  = Tahun Berdiri Yayasan Attin (2017)
--     22  = Tahun Masuk Pegawai (2022)
--     012 = Nomor Urut Pegawai ke-12 di unit tersebut
--
-- Kode Unit:
--   TK (01), SD (02), SMP (03), SMA (04)
-- ==============================================================================

-- 1. Tambah kolom niy_settings pada public.global_settings jika belum ada
ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS niy_settings JSONB NOT NULL DEFAULT '{
  "tahunBerdiriYayasan": "17",
  "panjangNomorUrut": 3,
  "kodeUnit": {
    "tk": "01",
    "sd": "02",
    "smp": "03",
    "sma": "04"
  }
}'::jsonb;

-- 2. Perbarui nilai default jika sudah ada baris id=1
UPDATE public.global_settings
SET niy_settings = '{
  "tahunBerdiriYayasan": "17",
  "panjangNomorUrut": 3,
  "kodeUnit": {
    "tk": "01",
    "sd": "02",
    "smp": "03",
    "sma": "04"
  }
}'::jsonb
WHERE id = 1 AND (niy_settings IS NULL OR niy_settings = '{}'::jsonb);

-- 3. Beri komentar dokumentasi resmi pada kolom NIY
COMMENT ON COLUMN public.staff.niy IS
'NIY 9 Digit: [Kode Unit 2 digit: TK=01, SD=02, SMP=03, SMA=04][Tahun Yayasan 17][Tahun Masuk 2 digit][Nomor Urut 3 digit]. Contoh: 011722012';

-- 4. Fungsi pembantu Postgres untuk validasi format NIY
CREATE OR REPLACE FUNCTION public.fn_validate_niy_format(p_niy VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Wajib 9 digit angka
  IF p_niy IS NULL OR LENGTH(p_niy) != 9 OR p_niy !~ '^\d{9}$' THEN
    RETURN FALSE;
  END IF;

  -- Digit 1-2: Kode Unit (01, 02, 03, 04)
  IF SUBSTRING(p_niy FROM 1 FOR 2) NOT IN ('01', '02', '03', '04') THEN
    RETURN FALSE;
  END IF;

  -- Digit 3-4: Wajib 17 (Tahun Berdiri Yayasan)
  IF SUBSTRING(p_niy FROM 3 FOR 2) != '17' THEN
    RETURN FALSE;
  END IF;

  -- Digit 7-9: Nomor urut harus > 000
  IF SUBSTRING(p_niy FROM 7 FOR 3) = '000' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
