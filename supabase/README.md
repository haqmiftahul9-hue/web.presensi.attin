# Panduan Instalasi & Eksekusi Skema Supabase SimPres Attin

Skema database lengkap telah dibuat pada berkas [`supabase/schema.sql`](./schema.sql). Skema ini siap dieksekusi langsung pada **SQL Editor** di dashboard Supabase Anda.

---

## 🚀 Langkah Eksekusi di Dashboard Supabase

1. **Buka Dashboard Supabase**:
   Kunjungi [https://supabase.com/dashboard](https://supabase.com/dashboard) dan pilih project Anda.
2. **Buka SQL Editor**:
   Pada menu navigasi sisi kiri, klik ikon terminal / **SQL Editor**.
3. **Buat Query Baru**:
   Klik tombol **"+ New query"** (atau New snippet).
4. **Tempelkan Skema**:
   Buka berkas [`supabase/schema.sql`](./schema.sql), salin (*copy*) seluruh isinya, lalu tempel (*paste*) ke dalam editor SQL Supabase.
5. **Jalankan Query**:
   Klik tombol **"Run"** (atau tekan `Ctrl + Enter`).
6. **Selesai**:
   Tunggu hingga muncul pesan `Success. No rows returned`. Seluruh tabel, enum, relasi, fungsi, trigger, Row Level Security (RLS), dan bucket storage kini sudah aktif.

---

## 🗄️ Struktur Tabel yang Dibuat

| Nama Tabel | Deskripsi & Fungsi |
| :--- | :--- |
| `public.units` | Data master 4 unit sekolah (TKIT, SDIT, SMPIT, SMAIT), koordinat GPS, radius geofence, dan logo. |
| `public.work_schedules` | Aturan jam kerja global (Senin-Kamis 07:10-16:00, Jumat 07:10 bebas pulang, Sabtu 07:30-13:00). |
| `public.staff` | Data induk guru & pegawai, status kepegawaian, jabatan, pendidikan asal, kontak, dan biodata. |
| `public.staff_faces` | Data biometrik pendaftaran wajah (Face-api.js) berisi 128-d floating point embedding vector. |
| `public.users` | Profil pengguna login aplikasi yang tersinkronisasi otomatis dengan `auth.users` Supabase. |
| `public.attendance` | Catatan presensi harian, jam masuk/pulang, status keterlambatan, metode, GPS, dan face score. |
| `public.leaves` | Pengajuan izin dan cuti pegawai, periode, durasi, berkas lampiran, dan status persetujuan. |
| `public.activity_logs` | Audit trail pencatatan aktivitas pengguna (Superadmin, Admin Unit, Guru). |
| `public.global_settings` | Pengaturan yayasan, kontak sekretariat, logo per unit, format nomor laporan, dan penandatangan. |

---

## 📦 Supabase Storage Buckets yang Otomatis Terbuat

Skema ini sudah menyertakan konfigurasi bucket penyimpanan berkas beserta kebijakan keamanannya (*Storage RLS*):

1. **`avatars`** *(Public)*: Untuk foto profil guru dan staf.
2. **`unit-logos`** *(Public)*: Untuk logo yayasan dan logo khusus masing-masing unit sekolah.
3. **`face-snapshots`** *(Private / Authenticated)*: Foto verifikasi wajah saat presensi atau enrollment biometrik.
4. **`leave-attachments`** *(Private / Authenticated)*: Surat dokter, dispensasi, atau berkas pengajuan izin/cuti.

---

## 🔐 Keamanan & Row Level Security (RLS)

- **Superadmin**: Memiliki akses penuh (SELECT, INSERT, UPDATE, DELETE) ke seluruh data di semua unit.
- **Admin Unit**: Dibatasi hanya dapat mengelola data guru, presensi, cuti, dan log pada unit sekolahnya sendiri.
- **Guru / Pegawai**: Hanya dapat membaca dan menambah data presensi dan pengajuan cuti milik dirinya sendiri.

---

## 🔌 Cara Mengintegrasikan Client Supabase ke Aplikasi React (Next Step)

Bila Anda ingin menghubungkan aplikasi React ke database Supabase, cukup jalankan:

```bash
npm install @supabase/supabase-js
```

Lalu buat berkas `src/lib/supabaseClient.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

