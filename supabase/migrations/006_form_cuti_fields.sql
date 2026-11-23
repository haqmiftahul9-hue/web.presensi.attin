-- ============================================================================
-- MIGRATION 006: KOLOM FORMULIR CUTI RESMI (PDF) PADA TABEL PUBLIC.LEAVES
-- ============================================================================
-- Menambahkan kolom pendukung formulir cuti resmi Yayasan Islam At-Tin Indonesia:
-- 1. tanggal_masuk_kembali : Tanggal pertama kembali masuk kerja setelah cuti
-- 2. alamat_cuti           : Alamat domisili/lokasi karyawan selama cuti
-- 3. telp_cuti             : Nomor kontak/HP selama menjalankan cuti
-- 4. kategori_cuti         : Kategori cuti ('tahunan', 'dispensasi', dll.)
-- 5. sub_jenis_dispensasi  : Sub-kategori cuti dispensasi resmi (7 pilihan)
-- 6. anak_ke               : Melahirkan anak ke- (untuk dispensasi melahirkan)
-- 7. hak_cuti              : Kuota hak cuti tahunan (default 7 hari)
-- 8. durasi_diambil        : Jumlah hari kerja cuti yang diambil
-- 9. sisa_cuti             : Sisa kuota cuti tahunan
-- ============================================================================

ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS tanggal_masuk_kembali DATE;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS alamat_cuti TEXT;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS telp_cuti VARCHAR(30);
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS kategori_cuti VARCHAR(30);
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS sub_jenis_dispensasi VARCHAR(100);
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS anak_ke INTEGER;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS hak_cuti INTEGER;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS durasi_diambil INTEGER;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS sisa_cuti INTEGER;

COMMENT ON COLUMN public.leaves.tanggal_masuk_kembali IS 'Tanggal masuk kerja kembali setelah cuti berakhir';
COMMENT ON COLUMN public.leaves.alamat_cuti IS 'Alamat domisili/lokasi karyawan selama menjalankan cuti';
COMMENT ON COLUMN public.leaves.telp_cuti IS 'Nomor telepon/HP yang dapat dihubungi selama cuti';
COMMENT ON COLUMN public.leaves.kategori_cuti IS 'Kategori cuti: tahunan atau dispensasi';
COMMENT ON COLUMN public.leaves.sub_jenis_dispensasi IS 'Sub-kategori cuti dispensasi resmi sesuai formulir yayasan';
COMMENT ON COLUMN public.leaves.anak_ke IS 'Nomor anak yang dilahirkan (khusus dispensasi melahirkan)';
COMMENT ON COLUMN public.leaves.hak_cuti IS 'Hak cuti tahunan pegawai';
COMMENT ON COLUMN public.leaves.durasi_diambil IS 'Jumlah hari cuti yang diambil';
COMMENT ON COLUMN public.leaves.sisa_cuti IS 'Sisa hak cuti tahunan setelah dipotong';
