import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { useNavigate } from 'react-router-dom'
import {
  useSimPresOptional, selectSelfStaff, selectSelfPresensi, selectUnitById, selectEmployeeCard,
  selectCanChangeOwnPassword, performLogout,
} from '../../store/simPresStore.jsx'
import { formatDateID, statusKepegawaianGroup } from '../../data/employeeCard.js'
import { daftarJamKerja } from '../../data/jamKerja.js'
import { getEmployeeGreeting, getEmployeeFormalName } from '../../data/sapaanPegawai.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { FormEditProfil } from '../../components/mobile/FormEditProfil.jsx'
import { ErrorState, LoadingState } from '../../components/mobile/Feedback.jsx'

/** Baris informasi label:nilai.
 *
 *  Memakai `.sp-data-row` supaya seragam di semua kartu: label tidak pernah
 *  menempel ke sisi kiri card, value boleh rata kanan tetapi tetap berjarak
 *  aman dari sisi kanan card, dan tiap baris punya napas vertikal sendiri
 *  (`padding-block`) plus divider yang mengikuti lebar area konten. */
function Baris({ label, nilai }) {
  if (!nilai) return null
  return (
    <div className="sp-data-row">
      <span className="sp-data-row-label font-body-sm text-body-sm text-on-surface-variant">{label}</span>
      <span className="sp-data-row-value font-body-md-medium text-body-md-medium text-on-surface">{nilai}</span>
    </div>
  )
}

/**
 * Bagian yang bisa dibuka-tutup (accordion). dippingakai untuk Data Pribadi dan
 * Kartu ID supaya halaman tetap ringan di layar 390px, dan tidak menambah menu
 * baru di navigasi bawah.
 *
 * `sp-card-flush` mematikan padding kartu supaya baris di dalamnya bisa
 * menentukan jaraknya sendiri (16px) — dengan begitu judul bagian tidak
 * pernah menempel ke border kartu dan kontennya bisa menyentuh tepi kartu
 * dengan rapi.
 */
function Bagian({ judul, ikon, terbuka, onToggle, children }) {
  return (
    <section className="sp-card sp-card-flush overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="w-full flex items-center gap-2.5 p-4 text-left"
      >
        <span className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
          <Icon name={ikon} className="text-on-surface-variant text-[18px]" />
        </span>
        <span className="flex flex-col min-w-0 flex-1">
          <span className="font-headline-sm text-headline-sm text-on-surface">{judul}</span>
        </span>
        <Icon name={terbuka ? 'expand_less' : 'expand_more'} className="text-outline text-[20px] shrink-0" />
      </button>
      {terbuka && <div className="px-4 pb-4 animate-sp-rise">{children}</div>}
    </section>
  )
}

/** Baris menu.
 *
 *  Pembatas antar baris memakai `border-b` pada pembungkus di luar, bukan pada
 *  tombolnya. Dengan begitu divider-nya mengikuti area konten (16px dari sisi
 *  kartu) dan tidak pernah menyentuh border kartu. */
function BarisMenu({ ikon, judul, sub, tone = 'text-on-surface', onClick }) {
  return (
    <div className="border-b border-surface-container last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 py-3.5 text-left active:bg-surface-container-low transition-colors"
      >
        <span className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
          <Icon name={ikon} className={`text-[18px] ${tone}`} />
        </span>
        <span className="flex flex-col min-w-0 flex-1">
          <span className="font-body-md-medium text-body-md-medium text-on-surface">{judul}</span>
          {sub && <span className="font-label-sm text-label-sm text-on-surface-variant leading-snug">{sub}</span>}
        </span>
        <Icon name="chevron_right" className="text-outline text-[20px] shrink-0" />
      </button>
    </div>
  )
}

/**
 * Profil mobile role Guru/Pegawai.
 *
 * Hanya berisi data milik pegawai sendiri dan empat menu yang relevan untuk
 * pegawai: data pribadi, kartu ID, ubah password, dan keluar. Tidak ada satu pun
 * menu administrasi (unit, admin & user, pengaturan) di halaman ini.
 */
function MobileProfilPage() {
  // Varian opsional: store yang belum siap berarti "sedang memuat", bukan
  // render gagal yang mengunci seluruh modul mobile.
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const dispatch = ctx?.dispatch ?? null
  const navigate = useNavigate()
  const staff = state ? selectSelfStaff(state) : null
  const presensi = state ? selectSelfPresensi(state) : null
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const kartu = staff ? selectEmployeeCard(state, staff.id) : null
  const bolehGantiSandi = state ? selectCanChangeOwnPassword(state) : false

  const [bukaPribadi, setBukaPribadi] = useState(false)
  const [bukaEdit, setBukaEdit] = useState(false)
  const [pesan, setPesan] = useState('')
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false)

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading Profil" detail="Mengambil data pegawai Anda…" />
      </div>
    )
  }

  if (!staff || !presensi) {
    return (
      <div className="sp-page-container py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="Profil hanya bisa dibuka untuk akun yang terhubung ke data pegawai."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }

  const rules = presensi.rules
  const kelompok = statusKepegawaianGroup(staff.statusPegawai)

  function keluar() {
    performLogout(dispatch)
    navigate('/login', { replace: true })
  }

  return (
    <div className="sp-page">
      {/* 1. PROFILE CARD — foto, nama, NIY, unit, jabatan. */}
      <section className="sp-hero sp-page-container pt-5 pb-24">
        <span className="sp-pattern-dots" aria-hidden="true" />
        <span className="sp-blob sp-blob-a" aria-hidden="true" />
        <span className="sp-blob sp-blob-b" aria-hidden="true" />

        <div className="relative z-[1] flex flex-col items-center gap-2 text-center">
          <div className="relative">
            <StaffAvatar
              staff={staff}
              size="w-24 h-24"
              textClass="font-display-lg text-display-lg"
              ring="ring-[3px] ring-white/20"
              className="shadow-xl"
            />
          </div>
          <span className="font-headline-sm text-headline-sm text-white mt-1">{getEmployeeGreeting(staff, { unit })}</span>
          <span className="font-label-sm text-label-sm text-white/70">
            {staff.role} • {unit?.nama || '-'}
          </span>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-white/12 border border-white/20 font-label-sm text-label-sm text-white/95">
              NIY {staff.niy}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/12 border border-white/20 font-label-sm text-label-sm text-white/95">
              {staff.statusPegawai || 'Pegawai'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/12 border border-white/20 font-label-sm text-label-sm text-white/95">
              {staff.status}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/12 border border-white/20 font-label-sm text-label-sm text-white/95">
              Jam Kerja {rules.hari} {rules.jamKerja}
            </span>
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4 pb-2">
        {pesan && (
          <p
            role="status"
            className="rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2.5 font-body-sm text-body-sm flex items-start gap-2"
          >
            <Icon name="check_circle" className="text-[16px] mt-0.5 shrink-0" />
            <span>{pesan}</span>
          </p>
        )}
        {/* Informasi utama sesuai data kepegawaian. */}
        <section className="sp-card p-4 flex flex-col gap-3.5">
          <div className="sp-card-head">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                <Icon name="badge" className="text-on-primary text-[18px]" />
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">Informasi Kepegawaian</span>
            </div>
          </div>
          <div>
            {/* Sapaan otomatis (Umi / Ustadz / Ustadzah) dihitung dari gender +
                unit pegawai. Nama resmi tetap ditampilkan di bawahnya karena
                begitulah nama tercatat pada dokumen kepegawaian. */}
            <Baris label="Sapaan" nilai={getEmployeeGreeting(staff, { unit })} />
            <Baris label="Nama lengkap" nilai={getEmployeeFormalName(staff)} />
            <Baris label="NIY" nilai={staff.niy} />
            <Baris label="NIP" nilai={staff.nip} />
            <Baris label="Jabatan" nilai={staff.role} />
            <Baris label="Unit sekolah" nilai={unit?.nama} />
            <Baris label="Status kepegawaian" nilai={`${staff.statusPegawai || '-'} (${kelompok})`} />
            <Baris label="Hari kerja hari ini" nilai={`${rules.hari} — ${rules.jamKerja}`} />
            <Baris label="Batas presensi" nilai={rules.batasMasuk} />
          </div>
        </section>

        {/* Jadwal jam kerja global — inilah satu-satunya acuan presensi, tanpa shift. */}
        <section className="sp-card p-4 flex flex-col gap-3.5">
          <div className="sp-card-head">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                <Icon name="schedule" className="text-on-primary text-[18px]" />
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">Jam Kerja Global</span>
            </div>
          </div>
          <div>
            {daftarJamKerja().map((h) => (
              <Baris key={h.hari} label={h.hari} nilai={h.jamKerja} />
            ))}
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
            Jumat tidak memiliki batas minimal jam pulang. Status Tepat Waktu / Terlambat ditentukan dari batas jam masuk hari tersebut.
          </p>
        </section>

        {/* Menu: data pribadi, kartu ID, ubah password, keluar.
            `sp-card-flush` + pembungkus `px-4` membuat isi dan divider menu
            sama-sama berjarak 16px dari sisi kartu. */}
        <section className="sp-card sp-card-flush overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <span className="font-headline-sm text-headline-sm text-on-surface">Menu</span>
          </div>

          <div className="px-4">
            <BarisMenu
              ikon="edit_note"
              judul="Ubah data pribadi"
              sub="Foto, nama, HP, email, alamat, tempat & tanggal lahir"
              onClick={() => {
                setBukaPribadi(false)
                setBukaEdit((v) => !v)
              }}
            />

            {bukaEdit && (
              <FormEditProfil
                staff={staff}
                unit={unit}
                onBatal={() => setBukaEdit(false)}
                onSimpan={async (isian, tambahan) => {
                  dispatch({ type: 'UPDATE_STAFF_PROFILE', payload: { ...isian, ...tambahan } })
                  setPesan('Data pribadi berhasil diperbarui dan langsung masuk ke Data Guru/Pegawai.')
                  setBukaEdit(false)
                }}
              />
            )}

            <BarisMenu
              ikon="person"
              judul="Data pribadi"
              sub="Data diri, pendidikan, kontak, dan rekening"
              onClick={() => {
                setBukaEdit(false)
                setBukaPribadi((v) => !v)
              }}
            />

            {bukaPribadi && (
              <div className="pb-4 -mt-1 animate-sp-rise">
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <Baris label="Tempat, tanggal lahir" nilai={[staff.tempatLahir, staff.tanggalLahir].filter(Boolean).join(', ')} />
                  <Baris label="Jenis kelamin" nilai={staff.jenisKelamin} />
                  <Baris label="Agama" nilai={staff.agama} />
                  <Baris label="Alamat" nilai={staff.alamat} />
                  <Baris label="Telepon" nilai={staff.kontak} />
                  <Baris label="Email dinas" nilai={staff.email} />
                  <Baris label="Pendidikan" nilai={[staff.pendTerakhir, staff.jurusan].filter(Boolean).join(' - ')} />
                  <Baris label="SK pengangkatan" nilai={staff.skPengangkatan} />
                  <Baris label="Tanggal masuk" nilai={staff.tanggalMasuk} />
                  <Baris label="NPWP" nilai={staff.npwp} />
                  <Baris label="BPJS Kesehatan" nilai={staff.bpjsKesehatan} />
                  <Baris label="BPJS Ketenagakerjaan" nilai={staff.bpjsKetenagakerjaan} />
                  <Baris label="Rekening" nilai={staff.rekeningBank} />
                  <Baris label="Nama pemilik rekening" nilai={staff.namaRekening} />
                </div>
              </div>
            )}

            {/* Kartu ID dan QR Presensi adalah dua halaman terpisah; keduanya
                memakai satu payload QR yang sama (employeeQrPayload). */}
            <BarisMenu
              ikon="contact_page"
              judul="Kartu ID Pegawai"
              sub={kartu ? `Berlaku s.d. ${formatDateID(kartu.expired_date)}` : 'Data kartu belum dibuat'}
              onClick={() => navigate('/mobile/kartu-id')}
            />

            <BarisMenu
              ikon="qr_code_scanner"
              judul="QR Presensi"
              sub="Kode unik untuk scan presensi & identifikasi"
              onClick={() => navigate('/mobile/qr')}
            />

            {bolehGantiSandi && (
              <BarisMenu
                ikon="password"
                judul="Ubah password"
                sub="Ganti kata sandi akun ini"
                onClick={() => dispatch({ type: 'REQUEST_PASSWORD_CHANGE' })}
              />
            )}

            <BarisMenu
              ikon="logout"
              judul="Logout"
              sub="Keluar dari akun ini"
              tone="text-error"
              onClick={() => setKonfirmasiKeluar(true)}
            />
          </div>
        </section>

        {konfirmasiKeluar && (
          <section className="sp-card p-4 flex flex-col gap-3.5 animate-sp-rise">
            <div className="flex items-start gap-2.5">
              <Icon name="logout" className="text-error text-[20px] shrink-0" />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-body-md-medium text-body-md-medium text-on-surface">Keluar dari akun?</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  Sesi {staff.name} di perangkat ini akan diakhiri.
                </span>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setKonfirmasiKeluar(false)}
                className="sp-btn flex-1 py-3 bg-surface-container-low text-on-surface font-label-md text-label-md active:scale-[0.99] transition-transform"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={keluar}
                className="sp-btn flex-1 py-3 bg-error text-on-error font-label-md text-label-md active:scale-[0.99] transition-transform"
              >
                Ya, Keluar
              </button>
            </div>
          </section>
        )}

        <p className="text-center font-label-sm text-label-sm text-on-surface-variant leading-snug">
          SimPres Kepegawaian • {unit?.kode || '-'} • versi 1.0.0
        </p>
      </div>
    </div>
  )
}

export default MobileProfilPage