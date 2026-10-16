import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import {
  useSimPresOptional, selectSelfStaff, selectSelfPresensi, selectUnitById,
} from '../../store/simPresStore.jsx'
import QRCodeSvg from '../../components/cards/QRCodeSvg.jsx'
import BarcodeSvg from '../../components/cards/BarcodeSvg.jsx'
import { employeeQrInfo, employeeQrPayload, cardBarcodeValue } from '../../data/employeeCard.js'
import { getEmployeeGreeting } from '../../data/sapaanPegawai.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { ErrorState, LoadingState } from '../../components/mobile/Feedback.jsx'

/**
 * QR PRESENSI — halaman terpisah dari Kartu ID.
 *
 * Satu kode untuk dua keperluan: dipindai di kios/pendaftaran untuk mencatat
 * presensi, dan dipakai untuk identifikasi pegawai. Karena itu isinya HARUS
 * sama dengan QR yang tercetak pada Kartu ID — keduanya memanggil
 * `employeeQrPayload(staff)`, satu-satunya fungsi yang membentuk payload QR
 * pegawai. Kalau halaman ini membuat payload sendiri, kartu yang dipegang
 * pegawai tidak akan cocok dengan kode yang ditampilkan di layar.
 *
 * Halaman ini sengaja lebih besar dan lebih sederhana daripada kartu: kode
 * dibuat sebesar mungkin supaya mudah dipindai dari layar ponsel.
 */
function MobileQrPage() {
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const navigate = useNavigate()

  const staff = state ? selectSelfStaff(state) : null
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const presensi = state ? selectSelfPresensi(state) : null
  const qr = staff ? employeeQrInfo(staff) : null
  const barcode = staff ? cardBarcodeValue(staff) : ''

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading QR Presensi" detail="Menyiapkan kode pegawai…" />
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="sp-page-container py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="QR hanya bisa dibuat untuk akun yang terhubung ke data pegawai."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="sp-page">
      <section className="sp-hero sp-page-container pt-4 pb-6">
        <span className="sp-pattern-dots" aria-hidden="true" />
        <span className="sp-blob sp-blob-a" aria-hidden="true" />
        <div className="relative z-[1]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Kembali"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </button>
          <StaffAvatar staff={staff} size="w-12 h-12" textClass="font-headline-sm text-headline-sm" />
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-white/70">QR Presensi</span>
            <h1 className="font-headline-sm text-headline-sm text-white truncate">
              {getEmployeeGreeting(staff, { unit })}
            </h1>
            <span className="font-label-sm text-label-sm text-white/70 truncate">{unit?.nama}</span>
          </div>
        </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4 pb-2">
        <section className="sp-card p-5 flex flex-col items-center gap-4">
          {/* QR sebesar mungkin supaya mudah dipindai dari layar. */}
          <div className="w-full max-w-[300px] aspect-square rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm flex items-center justify-center">
            <QRCodeSvg value={employeeQrPayload(staff)} className="h-full w-full text-[#323d8f]" title="QR presensi pegawai" />
          </div>

          <div className="text-center flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Kode pegawai ({qr.sumber})</span>
            <span className="font-mono text-headline-sm text-headline-sm text-on-surface tracking-widest break-all">
              {qr.identitas}
            </span>
          </div>

          <div className="w-full rounded-2xl bg-surface-container-low px-3.5 py-3 text-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant block">Payload QR</span>
            <span className="font-mono text-body-sm text-body-sm text-on-surface break-all">{qr.value}</span>
          </div>
        </section>

        <section className="sp-card p-4 flex flex-col gap-3.5">
          <div className="sp-card-head">
            <span className="font-headline-sm text-headline-sm text-on-surface">Kegunaan Kode</span>
          </div>
          <Penggunaan
            ikon="how_to_reg"
            judul="Scan Presensi"
            detail="Tunjukkan layar ini di kiosk atau perangkat pemindai unit untuk mencatat kehadiran."
          />
          <Penggunaan
            ikon="badge"
            judul="Identifikasi Pegawai"
            detail={`Memverifikasi bahwa yang memindai adalah ${staff.name}.`}
          />
          <Penggunaan
            ikon="credit_card"
            judul="Sama dengan Kartu ID"
            detail="Kode ini identik dengan QR pada Kartu ID PVC Anda — bukan kode terpisah."
          />
        </section>

        {barcode && (
          <section className="sp-card p-4 flex flex-col items-center gap-2.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Barcode (cadangan pemindaian 1D)</span>
            <div className="w-full max-w-[240px] text-primary">
              <BarcodeSvg value={barcode} className="h-[56px] w-full" />
            </div>
            <span className="font-mono text-body-sm text-body-sm text-on-surface tracking-widest">{barcode}</span>
          </section>
        )}

        <button
          type="button"
          onClick={() => navigate('/mobile/kartu-id')}
          className="sp-card sp-btn p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
        >
          <span className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
            <Icon name="contact_page" className="text-[22px] text-on-surface-variant" />
          </span>
          <span className="flex flex-col min-w-0 flex-1">
            <span className="font-body-md-medium text-body-md-medium text-on-surface">Lihat Kartu ID</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-snug">Pratinjau kartu PVC lengkap</span>
          </span>
          <Icon name="chevron_right" className="text-[20px] text-on-surface-variant shrink-0" />
        </button>

        {presensi && (
          <p className="text-center font-label-sm text-label-sm text-on-surface-variant leading-snug">
            Presensi hari ini {presensi.rules.hari}: {presensi.sudahMasuk ? presensi.statusMasuk : 'belum tercatat'}
            {presensi.sudahPulang ? ` • pulang ${presensi.pulang}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

function Penggunaan({ ikon, judul, detail }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
        <Icon name={ikon} className="text-[18px] text-on-surface-variant" />
      </span>
      <span className="flex flex-col min-w-0 gap-1">
        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{judul}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant leading-snug">{detail}</span>
      </span>
    </div>
  )
}

export default MobileQrPage
