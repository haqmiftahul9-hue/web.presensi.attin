// Single source of truth SimPres.
// Empat unit terdaftar: TK 1 + SD 6 + SMP 1 + SMA 0 = 10 pegawai (data uji coba sekolah).
// Data sintetis (buildFullStaff) tidak lagi dihasilkan; hanya STAFF di atas yang digunakan.
//
// Unit TIDAK lagi menyimpan jam masuk/pulang sendiri: jam kerja bersifat global
// per hari (Senin-Kamis 07:10-16:00, Jumat 07:10 tanpa batas pulang, Sabtu
// 07:30-13:00) dan dibaca dari data/jamKerja.js.

import {
  calculateAttendanceStatus, jamKerjaRules, jamKeMenit, JAM_MASUK_SENIN_KAMIS,
} from './jamKerja.js'

export const UNITS = [
  { id: 'tk', kode: 'UNT-TK-01', nama: 'TKIT Attin Sumbar', alamat: 'Jl. Cendekia No. 41', radius: 50, total: 1, hadir: 1, icon: 'child_care', latitude: -6.28945, longitude: 106.79234, geofenceActive: true },
  { id: 'sd', kode: 'UNT-SD-02', nama: 'SDIT Attin Sumbar', alamat: 'Jl. Cendekia No. 43, Cilandak', radius: 75, total: 6, hadir: 6, icon: 'school', latitude: -6.28955, longitude: 106.79244, geofenceActive: true },
  { id: 'smp', kode: 'UNT-SMP-03', nama: 'SMPIT Attin Sumbar', alamat: 'Jl. Cendekia No. 45', radius: 50, total: 1, hadir: 1, icon: 'school', latitude: -6.28965, longitude: 106.79254, geofenceActive: true },
  { id: 'sma', kode: 'UNT-SMA-04', nama: 'SMAIT Attin Sumbar', alamat: 'Jl. Cendekia No. 47', radius: 80, total: 2, hadir: 1, icon: 'school', latitude: -6.28975, longitude: 106.79264, geofenceActive: true },
]

// Field `foto` dibaca lewat cardPhotoOf() (dipakai Cetak Kartu ID dan modul
// mobile). Pegawai yang fotonya belum lengkap tetap bisa login dan presensi —
// komponen hanya jatuh ke inisial bila foto kosong.
export const STAFF = [
  { id: 1, niy: '049005069', name: 'Erianto, S.Ag, M.Pd.I', role: 'Guru PAI', unitId: 'smp', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-MXuXRJ1EkWzJfim-TRUn9IhLY4FXRcPPOKetAaBGaR0u1mXy0qUOI_BpbYA1kMEDTU0QXAELQtN9SS9yUyIprZfrmP-2ylcZFGaU4J6mevGOdNZpcD7Os20qPRgstQAMVYBmXD_SWIFMuTUF_-cxXaQMSJDc8cLOvemGLZ4fZ4tpqXETOfHJ9V3Ha1gTOXyP54p21_TqTb6iYUYVOt2GhPChIN_619NWaWfGc3GV1xmeFg-b_XvH', pendidikanAsal: 'UIN Imam Bonjol', nomorIdentitas: '3174012345678901', kontak: '081234567890', email: 'erianto@simpres.sch.id', gelar: 'S.Ag, M.Pd.I', tempatLahir: 'Jakarta', tanggalLahir: '1985-01-01', jenisKelamin: 'Laki-laki', agama: 'Islam', alamat: 'Jl. Cendekia No. 45, Jakarta Selatan', statusPegawai: 'Guru Tetap Yayasan', tanggalMasuk: '2005-01-01', skPengangkatan: 'SK-001/2005', pendTerakhir: 'S2 Pendidikan Islam', jurusan: 'Pendidikan Agama Islam', npwp: '12.345.678.9-012.000', bpjsKesehatan: '1234567890', bpjsKetenagakerjaan: '0987654321', rekeningBank: 'BCA - 1234567890', namaRekening: 'Erianto, S.Ag, M.Pd.I' },
  { id: 2, niy: '049097021', name: 'Bustanul Abidin, S.Pd', role: 'Guru Kelas 6 & Kurikulum', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtv1OUHPws-AWx9iskicD-xyXNkEABatzXm5eBcRXgF_GL-KejDndjKlShEZegx4yHypBWwH5r8_tSWvanY5aAyoybZh-QZ1sLP4ptY-fcoER3Nt5UbvSgMt5bceBMklPxH5QSsfvgFtPAcI2Yad6juSoCIbUPxvdAPeThKUGVaM1GT6Bgo6BCkU4aAP09p8iYdEPbzOQxc2sGJKbNk1TGXh9V1gvi1C09-MS7rM1p2Q67GRsZRlLP', pendidikanAsal: 'Universitas Negeri Padang', nomorIdentitas: '3174012345678902', kontak: '081234567891', email: 'bustanul@simpres.sch.id', gelar: 'S.Pd', tempatLahir: 'Jakarta', tanggalLahir: '1990-02-15', jenisKelamin: 'Laki-laki', agama: 'Islam', alamat: 'Jl. Cendekia No. 43, Cilandak', statusPegawai: 'Guru Tetap Yayasan', tanggalMasuk: '2010-01-01', skPengangkatan: 'SK-002/2010', pendTerakhir: 'S1 Pendidikan Dasar', jurusan: 'Pendidikan Guru Sekolah Dasar', npwp: '12.345.678.9-012.001', bpjsKesehatan: '1234567891', bpjsKetenagakerjaan: '0987654322', rekeningBank: 'BRI - 1234567891', namaRekening: 'Bustanul Abidin, S.Pd' },
  { id: 3, niy: '049098034', name: 'Sulasmi, S.Pd', role: 'Guru Kelas 3 • Tahfidz', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBR0Nf780V4TW5EdW3x62VrF1mPeNfTijQcDdxc59B9ubyV8RGmdaTXCkZPzhlvhnP7LBqmtcJHvsAxz9r01ezF_bFWHmuLMl-0-LAIdJlO79vFwk8Qyvg0H1iwvSnBkLxUEo_7MAd-p8WrlB-jcPZ9iLJsffhkB4WNrTl46s6mFCA8flFDz_gnEl9y7yRHpS-8Lz-h4ooLmcve2qDW0o9lK-Ek-tTO0j81279bi9yAKLokoYLuvlYl', pendidikanAsal: 'Universitas Negeri Padang', nomorIdentitas: '3174012345678903', kontak: '081234567892', email: 'sulasmi@simpres.sch.id', gelar: 'S.Pd', tempatLahir: 'Jakarta', tanggalLahir: '1988-03-20', jenisKelamin: 'Perempuan', agama: 'Islam', alamat: 'Jl. Cendekia No. 43, Cilandak', statusPegawai: 'Guru Kontrak', tanggalMasuk: '2012-02-01', skPengangkatan: 'SK-003/2012', pendTerakhir: 'S1 Pendidikan Dasar', jurusan: 'Pendidikan Guru Sekolah Dasar', npwp: '12.345.678.9-012.002', bpjsKesehatan: '1234567892', bpjsKetenagakerjaan: '0987654323', rekeningBank: 'BNI - 1234567892', namaRekening: 'Sulasmi, S.Pd' },
  { id: 4, niy: '049001054', name: 'Wisna Yunita, S.Pd', role: 'Guru Kelas 1 • Tematik', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgynuekB8Gk1EhgzxCAEejK5QCTq--dxn-zhjUUG3wR0PBRIGnNMlQIs7NO9Pql4clk3HulUrOaOMyjxLs03dNJWmhD0yJjKT_S6C-rrbJCVqEoKMSiVHbYqM9GjtcXDlmSsGn8sWeC2NgHwvKBa2LFc9hLA-HF9a5q2eQP3TnGynFxmAyU8kyttA6EOaQCMgzJm5dTjI6_2IvOq4XVWw-ar0Lex26qXNl6LYX--f8Xg2lnZa6G36M', pendidikanAsal: 'Universitas Negeri Padang', nomorIdentitas: '3174012345678904', kontak: '081234567893', email: 'wisna@simpres.sch.id', gelar: 'S.Pd', tempatLahir: 'Jakarta', tanggalLahir: '1992-04-10', jenisKelamin: 'Perempuan', agama: 'Islam', alamat: 'Jl. Cendekia No. 43, Cilandak', statusPegawai: 'Guru Tetap Yayasan', tanggalMasuk: '2015-02-01', skPengangkatan: 'SK-004/2015', pendTerakhir: 'S1 Pendidikan Dasar', jurusan: 'Pendidikan Guru Sekolah Dasar', npwp: '12.345.678.9-012.003', bpjsKesehatan: '1234567893', bpjsKetenagakerjaan: '0987654324', rekeningBank: 'Mandiri - 1234567893', namaRekening: 'Wisna Yunita, S.Pd' },
  { id: 5, niy: '029011052', name: 'Irmawati, S.Pd', role: 'Guru Sentra', unitId: 'tk', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAErGf59KRZdYfRNLNdlmpkXGa5j9VodsvW9IRQifB4TyvBErE96-O2fTll8QeORfSkrgDLyPkcihNMjYS_IL9StJ5CvC00HjvGar8zzdcML9dpnx7Ft2Bgq-D7lHmiNgnpfC82SZnpRh2R3bfWtaVGD9h5-Po7Hv8UaCWaRqjnPJCYF66Rtoj1Ahmp8uuJ7IFyUljXKmHGpz45QoRdfwL745jycsBIuVyPh7yQ1t__vwUZQRwXIJO2', pendidikanAsal: 'Universitas Negeri Padang', nomorIdentitas: '3174012345678905', kontak: '081234567894', email: 'irmawati@simpres.sch.id', gelar: 'S.Pd', tempatLahir: 'Jakarta', tanggalLahir: '1995-05-25', jenisKelamin: 'Perempuan', agama: 'Islam', alamat: 'Jl. Cendekia No. 41', statusPegawai: 'Guru Magang', tanggalMasuk: '2018-05-01', skPengangkatan: 'SK-005/2018', pendTerakhir: 'S1 Pendidikan Anak Usia Dini', jurusan: 'PAUD', npwp: '12.345.678.9-012.004', bpjsKesehatan: '1234567894', bpjsKetenagakerjaan: '0987654325', rekeningBank: 'BCA - 1234567894', namaRekening: 'Irmawati, S.Pd' },
  { id: 6, niy: '029012056', name: 'Risa Fadillah, S.Pd', role: 'Guru Biologi & Laboran', unitId: 'sma', status: 'Nonaktif', masuk: null, method: null, lateMinutes: 0, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbu7OLsBLkoyJ8OZpawNAqI7xd451RkNs9K0c_yDYsZnHJbbwwxMZAW-C1LJNc3Z0Q9sIGpEf77y0K6jOxaQyIjfR-PCKwr9Q45Y4lRqtPsIRPtUOBSp001rUNcpuo_fAxRf0zOckiHZqHBnoQRi-wrohmT-PbS_RcSHEDza_AHB445QyPvtomv5dzBtxuTuQy1IOQwv3syqjpre3Zl0SCanOmnRGl2o2NMV5JQ44Vc5CuQ6f6bVRv', pendidikanAsal: 'Universitas Andalas', nomorIdentitas: '3174012345678906', kontak: '081234567895', email: 'risa@simpres.sch.id', gelar: 'S.Pd', tempatLahir: 'Jakarta', tanggalLahir: '1982-06-15', jenisKelamin: 'Perempuan', agama: 'Islam', alamat: 'Jl. Cendekia No. 47', statusPegawai: 'Guru Kontrak', tanggalMasuk: '2008-01-01', skPengangkatan: 'SK-006/2008', pendTerakhir: 'S1 Biologi', jurusan: 'Biologi', npwp: '12.345.678.9-012.005', bpjsKesehatan: '1234567895', bpjsKetenagakerjaan: '0987654326', rekeningBank: 'BRI - 1234567895', namaRekening: 'Risa Fadillah, S.Pd' },
  { id: 7, niy: '049033108', name: 'Hendra Kurniawan, S.Pd.I', role: 'Guru Agama', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, alpha: false, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjdgkgO9xnqglSqom5PGQPOnWpKDM4PuWSeTuRTW865YOYa64INb-nuOfD2D3VSRbRKOfI6rWrxHBOTbvDf39XGdupMMKKJbVTBVe0sK7FjPqw6lZ0dwGxEfv-s82nKGMMIIrNl-HbHiIvqTpwd0Y8ee1T43iJnyKO2mKjSmQceTIIC-4tcr8UZHwdzhaEpPIbJOepESXnyCXGtlQJvtPkN-5TwXom1lzKUazjmykrK9JSIBB3M0RO', pendidikanAsal: 'UIN Imam Bonjol', nomorIdentitas: '3174012345678907', kontak: '081234567896', email: 'hendra@simpres.sch.id', gelar: 'S.Pd.I', tempatLahir: 'Jakarta', tanggalLahir: '1987-07-20', jenisKelamin: 'Laki-laki', agama: 'Islam', alamat: 'Jl. Cendekia No. 43, Cilandak', statusPegawai: 'Guru Magang', tanggalMasuk: '2013-07-01', skPengangkatan: 'SK-007/2013', pendTerakhir: 'S1 Pendidikan Agama Islam', jurusan: 'Pendidikan Agama Islam', npwp: '12.345.678.9-012.006', bpjsKesehatan: '1234567896', bpjsKetenagakerjaan: '0987654327', rekeningBank: 'BNI - 1234567896', namaRekening: 'Hendra Kurniawan, S.Pd.I' },
  { id: 8, niy: '049023183', name: 'Silvana Monica, S.Ak', role: 'Staf Administrasi', unitId: 'sma', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, outsideRadius: false, pendidikanAsal: 'Universitas Negeri Padang', nomorIdentitas: '3174012345678908', kontak: '081234567897', email: 'silvana@simpres.sch.id', gelar: 'S.Ak', tempatLahir: 'Jakarta', tanggalLahir: '1989-08-30', jenisKelamin: 'Perempuan', agama: 'Islam', alamat: 'Jl. Cendekia No. 47', statusPegawai: 'Pegawai Tetap Yayasan', tanggalMasuk: '2014-08-01', skPengangkatan: 'SK-008/2014', pendTerakhir: 'S1 Akuntansi', jurusan: 'Akuntansi', npwp: '12.345.678.9-012.007', bpjsKesehatan: '1234567897', bpjsKetenagakerjaan: '0987654328', rekeningBank: 'Mandiri - 1234567897', namaRekening: 'Silvana Monica, S.Ak' },
  { id: 9, niy: '029045122', name: 'Rizal Ramli, S.Pd.I', role: 'Guru PAI', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, pendidikanAsal: 'UIN Imam Bonjol', nomorIdentitas: '3174012345678909', kontak: '081234567898', email: 'rizal.r@sd.rj.sch.id', gelar: 'S.Pd.I', tempatLahir: 'Jakarta', tanggalLahir: '1986-09-12', jenisKelamin: 'Laki-laki', agama: 'Islam', alamat: 'Jl. Cendekia No. 43, Cilandak', statusPegawai: 'Guru Tetap Yayasan', tanggalMasuk: '2016-01-01', skPengangkatan: 'SK-009/2016', pendTerakhir: 'S1 Pendidikan Agama Islam', jurusan: 'Pendidikan Agama Islam', npwp: '12.345.678.9-012.008', bpjsKesehatan: '1234567898', bpjsKetenagakerjaan: '0987654329', rekeningBank: 'BCA - 1234567898', namaRekening: 'Rizal Ramli, S.Pd.I' },
  { id: 10, niy: '029056134', name: 'Dewi Sartika, S.Pd', role: 'Guru Kelas 2', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0, pendidikanAsal: 'Universitas Negeri Padang', nomorIdentitas: '3174012345678910', kontak: '081234567899', email: 'dewi.s@sd.rj.sch.id', gelar: 'S.Pd', tempatLahir: 'Jakarta', tanggalLahir: '1991-11-08', jenisKelamin: 'Perempuan', agama: 'Islam', alamat: 'Jl. Cendekia No. 43, Cilandak', statusPegawai: 'Guru Kontrak', tanggalMasuk: '2017-03-01', skPengangkatan: 'SK-010/2017', pendTerakhir: 'S1 Pendidikan Dasar', jurusan: 'Pendidikan Guru Sekolah Dasar', npwp: '12.345.678.9-012.009', bpjsKesehatan: '1234567899', bpjsKetenagakerjaan: '0987654330', rekeningBank: 'BNI - 1234567899', namaRekening: 'Dewi Sartika, S.Pd' },
]

export const LEAVES = [
  { id: 1, staffId: 4, jenis: 'Sakit', periode: '16-18 Sep 2026', durasi: '3 Hari', lampiran: 'Surat_Dokter.pdf', status: 'Menunggu' },
  { id: 2, staffId: 7, jenis: 'Izin Pribadi', periode: '15 Sep 2026', durasi: '1 Hari', lampiran: 'Undangan.pdf', status: 'Menunggu' },
  { id: 3, staffId: 6, jenis: 'Cuti Penting', periode: '18-25 Sep 2026', durasi: '6 Hari', lampiran: 'Berkas_Cuti.pdf', status: 'Menunggu' },
  { id: 4, staffId: 3, jenis: 'Sakit', periode: '08-09 Sep 2026', durasi: '2 Hari', lampiran: 'Surat_Sakit.pdf', status: 'Disetujui' },
  { id: 5, staffId: 8, jenis: 'Sakit', periode: '08-09 Sep 2026', durasi: '2 Hari', lampiran: 'Surat_Sakit_RS.pdf', status: 'Disetujui' },
  { id: 6, staffId: 2, jenis: 'Izin Pribadi', periode: '02 Sep 2026', durasi: '1 Hari', lampiran: 'Dispensasi.pdf', status: 'Ditolak' },
]

// Kata sandi awal untuk seluruh akun pegawai (role Guru/Pegawai).
// Satu nilai bersama supaya mudah dihafal saat pelatihan, dan TIDAK ikut
// mencurigakan NIY orang (versi lama "<NIY>@2026" bisa dibaca sebagai data
// pribadi). Akun pegawai TIDAK ber-wajibGantiSandi: setelah login guru langsung
// masuk ke aplikasi mobile. Pengguna tetap bisa mengganti sendiri lewat menu
// "Ubah password" di Profil.
export const DEFAULT_STAFF_PASSWORD = 'Attin123!'

// Dipertahankan untuk kompatibilitas pemanggil lama; kredensial pegawai kini
// memakai satu password awal bersama, bukan per-NIY.
export const STAFF_PASSWORD_SUFFIX = '@2026'

export function initialStaffPassword() {
  return DEFAULT_STAFF_PASSWORD
}

// Status akun mengikuti status pegawai: pegawai Nonaktif tidak bisa login.
export const ACCOUNT_STATUS_AKTIF = 'Aktif'
export const ACCOUNT_STATUS_NONAKTIF = 'Nonaktif'

// Superadmin TIDAK punya unit: ia oversee seluruh unit (unitId null = pusat).
// Role selain Superadmin selalu terikat ke satu unit sesuai akunnya.
//
// Field tambahan pada akun:
// - username  : nama_pengguna alternatif untuk login (NIY & email tetap berlaku).
// - password  : kata sandi awal akun ini; bila kosong, dipakai konstanta
//               INITIAL_ACCOUNT_PASSWORD milik auth store.
// - mustChangePassword : wajib mengganti kata sandi sebelum bisa memakai sistem.
// - demo      : akun bawaan untuk pengujian role/unit (ditampilkan di halaman login).
export const ADMIN_USERS = [
  { id: 1, name: 'Bambang Hidayat, S.Kom', niy: '019001001', email: 'bambang.h@simpres.sch.id', role: 'Superadmin', unitId: null, status: 'Aktif' },
  { id: 2, name: 'Bustanul Abidin, S.Pd', niy: '049097021', email: 'bustanul.a@sd.rj.sch.id', role: 'Admin Unit', unitId: 'sd', status: 'Aktif' },
  { id: 3, name: 'Reki Gusman, S.E.', niy: '029010036', email: 'reki.g@smp.rj.sch.id', role: 'Admin Unit', unitId: 'smp', status: 'Aktif' },
  { id: 4, name: 'Silvana Monica, S.Ak', niy: '049023183', email: 'silvana.m@simpres.sch.id', role: 'Superadmin', unitId: null, status: 'Aktif' },
  { id: 5, name: 'Rizal Ramli, S.Pd.I', niy: '029045122', email: 'rizal.r@sd.rj.sch.id', role: 'Guru', unitId: 'sd', status: 'Aktif' },
  { id: 6, name: 'Marni Andayani, S.Kom', niy: '049066311', email: 'marni.a@smp.rj.sch.id', role: 'Petugas Presensi', unitId: 'smp', status: 'Aktif' },

  // ===== Akun default untuk pengujian (role & unit) =====
  // Superadmin: oversee semua unit, unit terpilih default "Semua Unit".
  { id: 7, name: 'Superadmin Pusat', niy: '019001007', username: 'superadmin', email: 'superadmin@simpres.sch.id', role: 'Superadmin', unitId: null, status: 'Aktif', password: 'superadmin1234!', mustChangePassword: false, demo: true },

  // Admin Unit: terkunci ke unit akunnya, tidak bisa melihat unit lain.
  { id: 8, name: 'Admin SD Unit 1', niy: '019001008', username: 'adminsd1', email: 'adminsd1@simpres.sch.id', role: 'Admin Unit', unitId: 'sd', status: 'Aktif', password: 'SDit@2026', mustChangePassword: false, demo: true },
  { id: 9, name: 'Admin SD Unit 2', niy: '019001009', username: 'adminsd2', email: 'adminsd2@simpres.sch.id', role: 'Admin Unit', unitId: 'sd', status: 'Aktif', password: 'SDdua@2026', mustChangePassword: false, demo: true },
  { id: 10, name: 'Admin TKIT Attin Sumbar', niy: '019001010', username: 'admintk', email: 'admintk@simpres.sch.id', role: 'Admin Unit', unitId: 'tk', status: 'Aktif', password: 'TKattin@2026', mustChangePassword: false, demo: true },
  { id: 11, name: 'Admin SMPIT Attin Sumbar', niy: '019001011', username: 'adminsmp', email: 'adminsmp@simpres.sch.id', role: 'Admin Unit', unitId: 'smp', status: 'Aktif', password: 'SMPattin@2026', mustChangePassword: false, demo: true },
  { id: 12, name: 'Admin SMAIT Attin Sumbar', niy: '019001012', username: 'adminsma', email: 'adminsma@simpres.sch.id', role: 'Admin Unit', unitId: 'sma', status: 'Aktif', password: 'SMAattin@2026', mustChangePassword: false, demo: true },
]

export const INITIAL_LOGS = [
  { id: 1, time: '15 Sep 2026, 11:42', actor: 'Bambang Hidayat', role: 'Superadmin', action: 'Ubah', target: 'Unit • SDIT Attin Sumbar', desc: 'Radius geofence 50m → 75m' },
  { id: 2, time: '15 Sep 2026, 09:15', actor: 'Bustanul Abidin', role: 'Admin SD', action: 'Tambah', target: 'Pegawai • Erianto', desc: 'Tambah NIY 049005069 Guru PAI' },
  { id: 3, time: '14 Sep 2026, 14:05', actor: 'Superadmin Pusat', role: 'Superadmin', action: 'Reset Password', target: 'Akun • Hendra Kurniawan', desc: 'Reset & kirim kredensial via WA' },
  { id: 4, time: '14 Sep 2026, 08:22', actor: 'Reki Gusman', role: 'Admin SMP', action: 'Ubah', target: 'Cuti • Wisna Yunita', desc: 'Setujui izin sakit 3 hari' },
  { id: 5, time: '13 Sep 2026, 17:10', actor: 'Bambang Hidayat', role: 'Superadmin', action: 'Login', target: 'Sesi • Console', desc: 'Login 103.144.12.8 (Chrome)' },
]

export const INITIAL_SETTINGS = {
  namaAplikasi: 'SIMPEG',
  tagline: 'Sistem Presensi Kepegawaian Terpadu',
  logo: '/icons/logo-simpeg.png',
  logoPerUnit: {
    tk: null,
    sd: null,
    smp: null,
    sma: null,
  },
  namaYayasan: 'Yayasan Islam Attin Indonesia',
  emailSekretariat: 'sekretariat@attinsumbar.sch.id',
  alamatYayasan: 'Jl. Raya Cendekia No. 45, Jakarta Selatan',
  noWhatsapp: '+62 811-9876-5432',
  zonaWaktu: 'WIB',
  presensi: {
    // ATURAN JAM KERJA GLOBAL — lihat data/jamKerja.js (sumber kebenaran).
    //   Senin - Kamis : jam masuk 07:10, jam pulang 16:00
    //   Jumat         : jam masuk 07:10, jam pulang bebas (tanpa batas minimal)
    //   Sabtu         : jam masuk 07:30, jam pulang 13:00
    // Field di bawah hanya disimpan agar data lama tidak rusak; presensi tidak
    // lagi membacanya — status selalu dihitung calculateAttendanceStatus().
    jamMasukDefault: '07:10',
    jamPulangDefault: '16:00',
    // Radius geofence default (meter)
    radiusGeofenceDefault: 50,
    // Aktif/nonaktif lokasi presensi
    lokasiAktif: true,
    // Radius geofence per unit (override)
    radiusGeofencePerUnit: {
      tk: 50,
      sd: 75,
      smp: 50,
      sma: 80,
    },
  },
  rekap: {
    // Format nomor laporan
    formatNomorLaporan: 'LPR/{UNIT}/{TAHUN}/{BULAN}/{URUT:04d}',
    // Prefix dokumen
    prefixDokumen: 'SIMPRES',
    // Default periode laporan
    defaultPeriodeLaporan: 'Bulanan',
  },
  notifikasi: {
    // Aktifkan notifikasi email
    emailAktif: true,
    // Aktifkan notifikasi WhatsApp
    whatsappAktif: true,
    // Notifikasi approval izin
    approvalIzinAktif: true,
  },
  keamanan: {
    // Minimal password
    minimalPassword: 8,
    // Wajib ganti password pertama kali login
    wajibGantiPasswordPertama: true,
    // Durasi session login (jam)
    durasiSession: 8,
    // Auto logout (menit tidak aktif)
    autoLogout: 30,
  },
  penandatangan: {
    kepalaYayasan: {
      nama: '',
      jabatan: 'Ketua Yayasan',
    },
    kepalaSekolah: {
      tk: { nama: '', jabatan: 'Kepala TKIT Attin Sumbar' },
      sd: { nama: '', jabatan: 'Kepala SDIT Attin Sumbar' },
      smp: { nama: '', jabatan: 'Kepala SMPIT Attin Sumbar' },
      sma: { nama: '', jabatan: 'Kepala SMAIT Attin Sumbar' },
    },
    petugasPresensi: {
      yayasan: { nama: '', jabatan: 'Petugas Presensi Yayasan' },
      tk: { nama: '', jabatan: 'Petugas Presensi TKIT' },
      sd: { nama: '', jabatan: 'Petugas Presensi SDIT' },
      smp: { nama: '', jabatan: 'Petugas Presensi SMPIT' },
      sma: { nama: '', jabatan: 'Petugas Presensi SMAIT' },
    },
    adminTU: {
      kepalaTU: { nama: '', jabatan: 'Kepala Tata Usaha' },
      operatorSistem: { nama: '', jabatan: 'Operator Sistem' },
    },
  },
}

export const WEEKLY_TREND = [
  { day: 'Sen', hadir: 182, terlambat: 12 },
  { day: 'Sel', hadir: 187, terlambat: 14 },
  { day: 'Rab', hadir: 190, terlambat: 9 },
  { day: 'Kam', hadir: 178, terlambat: 16 },
  { day: 'Jum', hadir: 184, terlambat: 11 },
  { day: 'Sab', hadir: 96, terlambat: 5 },
]

const WEEKDAY_INIT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const WEEKLY_MAP = {
  Min: { hadir: 95, terlambat: 4 },
  Sen: { hadir: 182, terlambat: 12 },
  Sel: { hadir: 187, terlambat: 14 },
  Rab: { hadir: 190, terlambat: 9 },
  Kam: { hadir: 178, terlambat: 16 },
  Jum: { hadir: 184, terlambat: 11 },
  Sab: { hadir: 96, terlambat: 5 },
}
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function buildTrend30() {
  const out = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 7, 17 + i)
    const wd = WEEKDAY_INIT[d.getDay()]
    const base = WEEKLY_MAP[wd] || WEEKLY_MAP.Sab
    const jitterH = ((d.getDate() * 7) % 5) - 2
    const jitterL = ((d.getDate() * 3) % 4) - 1
    out.push({
      day: `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`,
      wd,
      hadir: Math.max(80, Math.min(195, base.hadir + jitterH)),
      terlambat: Math.max(0, base.terlambat + jitterL),
    })
  }
  return out
}

export const TREND_30 = buildTrend30()

export const HOLIDAYS = [
  { date: '17 Agu 2026', name: 'Hari Kemerdekaan RI' },
  { date: '05 Sep 2026', name: 'Maulid Nabi Muhammad SAW' },
  { date: '25 Des 2026', name: 'Hari Raya Natal' },
]

export function initialsOf(name) {
  if (!name) return '?'
  const parts = String(name).split(/[\s,]+/).filter(Boolean)
  return (parts.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase()
}

const FIRST = ['Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gilang', 'Hesti', 'Indra', 'Joko', 'Kartika', 'Lina', 'Made', 'Nadia', 'Oscar', 'Putri', 'Rian', 'Sari', 'Tono', 'Utami', 'Vina', 'Wahyu', 'Yoga', 'Zahra', 'Andi', 'Bima', 'Dian', 'Farah', 'Hendra', 'Irma']
const LAST = ['Saputra', 'Wijaya', 'Kusuma', 'Pratama', 'Nugroho', 'Santoso', 'Rahmawati', 'Setiawan', 'Hidayat', 'Anggraini', 'Puspita', 'Firmansyah', 'Lestari', 'Ramadhan', 'Maharani', 'Gunawan', 'Permata', 'Utama', 'Wulandari', 'Hartono']
const TITLES = ['S.Pd', 'S.Ag', 'S.Kom', 'S.E.', 'S.Si', 'M.Pd', 'S.Pd.I', 'S.Ak', 'S.Sos', 'M.Si']
const ROLES_BY_UNIT = {
  tk: ['Guru Sentra', 'Guru Kelompok Bermain', 'Asisten Guru TK', 'Staf Administrasi TK'],
  sd: ['Guru Kelas', 'Guru Mapel', 'Guru Tahfidz', 'Staf TU SD', 'Guru PAI'],
  smp: ['Guru Mapel', 'Wali Kelas', 'Guru BK', 'Staf TU SMP', 'Guru PAI'],
  sma: ['Guru Mapel', 'Wali Kelas', 'Guru BK', 'Laboran', 'Staf TU SMA'],
}

function hashN(n) {
  let x = n * 2654435761
  x = (x ^ (x >> 13)) * 1274126177
  return (x ^ (x >> 16)) >>> 0
}

export function buildFullStaff() {
  return [...STAFF]
}

/**
 * Baris presensi "hari ini" untuk sekumpulan pegawai. Status dan lateMinutes
 * SELALU berasal dari calculateAttendanceStatus() supaya rekap, dashboard,
 * monitoring, dan laporan PDF tidak pernah menghitungnya sendiri.
 */
export function buildAttendance(staff, tanggal = new Date()) {
  const rules = jamKerjaRules(tanggal)
  return staff.map((s) => {
    const unit = UNITS.find((u) => u.id === s.unitId)
    const isHadir = Boolean(s.masuk)
    const hasil = calculateAttendanceStatus(tanggal, isHadir ? s.masuk : null)
    let status = hasil.status
    if (!isHadir && s.status !== 'Aktif') status = 'Tidak Aktif'
    return {
      id: s.id,
      staffId: s.id,
      name: s.name,
      niy: s.niy,
      role: s.role,
      unitId: s.unitId,
      unitName: unit ? unit.nama : s.unitId,
      tanggal: hasil.tanggal,
      hari: hasil.hari,
      jamKerja: hasil.jamKerja,
      jamMasuk: hasil.jamMasuk,
      jamPulang: hasil.jamPulang,
      masuk: s.masuk,
      pulang: isHadir ? s.pulang || rules.jamPulang : null,
      method: s.method,
      lateMinutes: hasil.lateMinutes,
      status,
      alpha: s.alpha || false,
      outsideRadius: s.outsideRadius || false,
    }
  })
}

// Catatan arsitektur: seed.js adalah SATU-SATUNYA sumber data kanonis SimPres.
// Pegawai (STAFF), Unit (UNITS), Izin/Cuti (LEAVES), Log (INITIAL_LOGS), dan
// Libur (HOLIDAYS) hanya hidup di sini. Tidak ada alias ekspor lain.
