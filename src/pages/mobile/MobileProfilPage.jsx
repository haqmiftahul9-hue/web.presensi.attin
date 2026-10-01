import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useSimPres, selectSelfStaff, selectSelfPresensi, selectUnitById, selectEmployeeCard,
  selectCanChangeOwnPassword, performLogout,
} from '../../store/simPresStore.jsx'
import { cardQrValue, cardBarcodeValue, formatDateID, statusKepegawaianGroup } from '../../data/employeeCard.js'
import { namaShift } from '../../data/presensiMobile.js'
import QRCodeSvg from '../../components/cards/QRCodeSvg.jsx'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { ErrorState } from '../../components/mobile/Feedback.jsx'

function Baris({ label, nilai }) {
  if (!nilai) return null
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-surface-container last:border-0">
      <span className="font-body-sm text-body-sm text-on-surface-variant shrink-0">{label}</span>
      <span className="font-body-md-medium text-body-md-medium text-on-surface text-right break-words">{nilai}</span>
    </div>
  )
}

/**
 * Bagian yang bisa dibuka-tutup (accordion). dippingakai untuk Data Pribadi dan
 * Kartu ID supaya halaman tetap ringan di layar 390px, dan tidak menambah menu
 * baru di navigasi bawah.
 */
function Bagian({ judul, ikon, terbuka, onToggle, children }) {
  return (
    <section className="sp-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="w-full flex items-center gap-2.5 p-4 text-left"
      >
        <span className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">{ikon}</span>
        </span>
        <span className="flex flex-col min-w-0 flex-1">
          <span className="font-headline-sm text-headline-sm text-on-surface">{judul}</span>
        </span>
        <span className="material-symbols-outlined text-outline text-[20px]">
          {terbuka ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {terbuka && <div className="px-4 pb-4 animate-sp-rise">{children}</div>}
    </section>
  )
}

function BarisMenu({ ikon, judul, sub, tone = 'text-on-surface', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-surface-container last:border-0 active:bg-surface-container-low transition-colors"
    >
      <span className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
        <span className={`material-symbols-outlined text-[18px] ${tone}`}>{ikon}</span>
      </span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="font-body-md-medium text-body-md-medium text-on-surface">{judul}</span>
        {sub && <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{sub}</span>}
      </span>
      <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
    </button>
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
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()
  const staff = selectSelfStaff(state)
  const presensi = selectSelfPresensi(state)
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const kartu = staff ? selectEmployeeCard(state, staff.id) : null
  const bolehGantiSandi = selectCanChangeOwnPassword(state)

  const [bukaPribadi, setBukaPribadi] = useState(false)
  const [bukaKartu, setBukaKartu] = useState(false)
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false)

  if (!staff || !presensi) {
    return (
      <div className="px-4 py-6">
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
      {/* Foto dan identitas utama. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-container via-[#12325f] to-[#08182f] text-on-primary px-4 pt-6 pb-10 rounded-b-[32px] shadow-lg">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-2 text-center">
          <div className="relative">
            <span className="absolute -inset-1.5 rounded-full bg-white/10" />
            <StaffAvatar
              staff={staff}
              size="w-24 h-24"
              textClass="font-display-lg text-display-lg"
              ring="ring-2 ring-white/20"
              className="shadow-xl"
            />
          </div>
          <span className="font-headline-sm text-headline-sm text-white mt-1">{staff.name}</span>
          <span className="font-label-sm text-label-sm text-on-primary-container">
            {staff.role} • {unit?.nama || '-'}
          </span>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90">
              {staff.statusPegawai || 'Pegawai'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90">
              {staff.status}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90">
              {namaShift(rules.jamMasuk)} {rules.jamMasuk} - {rules.jamPulang}
            </span>
          </div>
        </div>
      </section>

      <div className="px-4 -mt-6 relative z-20 flex flex-col gap-3 pb-6">
        {/* Informasi utama sesuai data kepegawaian. */}
        <section className="sp-card p-4">
          <div className="flex items-center gap-2 pb-1">
            <span className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">badge</span>
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Informasi Kepegawaian</span>
          </div>
          <div className="pt-1">
            <Baris label="Nama lengkap" nilai={staff.name} />
            <Baris label="NIY" nilai={staff.niy} />
            <Baris label="NIP" nilai={staff.nip} />
            <Baris label="Jabatan" nilai={staff.role} />
            <Baris label="Unit sekolah" nilai={unit?.nama} />
            <Baris label="Status kepegawaian" nilai={`${staff.statusPegawai || '-'} (${kelompok})`} />
          </div>
        </section>

        {/* Menu: data pribadi, kartu ID, ubah password, keluar. */}
        <section className="sp-card overflow-hidden">
          <div className="px-4 pt-4 pb-1">
            <span className="font-headline-sm text-headline-sm text-on-surface">Menu</span>
          </div>

          <BarisMenu
            ikon="person"
            judul="Data pribadi"
            sub="Data diri, pendidikan, kontak, dan rekening"
            onClick={() => setBukaPribadi((v) => !v)}
          />

          {bukaPribadi && (
            <div className="px-4 pb-4 -mt-1 animate-sp-rise">
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

          <BarisMenu
            ikon="badge"
            judul="Kartu ID Pegawai"
            sub={kartu ? `Berlaku s.d. ${formatDateID(kartu.expired_date)}` : 'Data kartu belum dibuat'}
            onClick={() => setBukaKartu((v) => !v)}
          />

          {bukaKartu && (
            <div className="px-4 pb-4 -mt-1 animate-sp-rise">
              <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col items-center gap-2">
                <div className="w-40 h-40 rounded-2xl bg-white p-2 border border-outline-variant/40 flex items-center justify-center">
                  <QRCodeSvg value={cardQrValue(staff)} className="h-full w-full text-primary" title="QR Code kartu ID" />
                </div>
                <div className="text-center">
                  <p className="font-mono text-body-sm text-body-sm text-on-surface tracking-widest">
                    {cardBarcodeValue(staff)}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Tunjukkan QR ini saat presensi barcode
                  </p>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
                  Nomor kartu {kartu?.id || '-'} • dicetak {kartu?.printed_count ?? 0} kali
                </p>
              </div>
            </div>
          )}

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
        </section>

        {konfirmasiKeluar && (
          <section className="sp-card p-4 flex flex-col gap-3 animate-sp-rise">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-[20px]">logout</span>
              <div className="flex flex-col">
                <span className="font-body-md-medium text-body-md-medium text-on-surface">Keluar dari akun?</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Sesi {staff.name} di perangkat ini akan diakhiri.
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKonfirmasiKeluar(false)}
                className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface font-label-md text-label-md active:scale-[0.99] transition-transform"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={keluar}
                className="flex-1 py-3 rounded-2xl bg-error text-on-error font-label-md text-label-md active:scale-[0.99] transition-transform"
              >
                Ya, Keluar
              </button>
            </div>
          </section>
        )}

        <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
          SimPres Kepegawaian • {unit?.kode || '-'} • versi 1.0.0
        </p>
      </div>
    </div>
  )
}

export default MobileProfilPage