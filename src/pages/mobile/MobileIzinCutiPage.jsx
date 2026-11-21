import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import DocumentViewerModal from '../../components/DocumentViewerModal.jsx'
import { uploadLeaveAttachment, getAttachmentName } from '../../services/leaveAttachmentService.js'
import {
  useSimPresOptional, selectSelfStaff, selectSelfLeaves, selectUnitById, addActivityLog,
  selectCurrentUserRole, ROLE_SUPERADMIN, ROLE_KEPALA_SEKOLAH,
} from '../../store/simPresStore.jsx'
import { isoHariIni } from '../../data/presensiMobile.js'
import { getEmployeeGreeting } from '../../data/sapaanPegawai.js'
import {
  JENIS_FORM, jenisIzinCuti, kelompokIzinCuti, aturanLampiran, ikonJenis,
  warnaJenis, WARNA_STATUS, LABEL_STATUS_PANJANG, STATUS_PENGAJUAN,
  buildPengajuan, validasiFormPengajuan, formatPeriode, hitungDurasiHari,
  MAKS_LAMPIRAN, hitungSisaKuota, kuotaJenis,
  isLeavePending, isLeaveApproved, isLeaveRejected,
} from '../../data/jenisIzinCuti.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { SectionTitle } from '../../components/mobile/AppShell.jsx'
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../components/mobile/Feedback.jsx'

const FIELD =
  'sp-field px-3.5 py-3 bg-slate-50 dark:bg-card border border-slate-200/80 dark:border-primary-border rounded-xl text-body-md text-slate-900 dark:text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all'
const LABEL = 'font-label-sm text-label-sm text-on-surface-variant mb-2 block'

/** Grouping pilihan jenis: Cuti dulu, lalu Izin. */
const JENIS_TERGROUP = [
  { kelompok: 'Cuti', nama: 'Cuti' },
  { kelompok: 'Izin', nama: 'Izin' },
].map((g) => ({
  ...g,
  opsi: JENIS_FORM.filter((j) => kelompokIzinCuti(j) === g.kelompok),
}))

function ukuranBerkas(byte) {
  if (!Number.isFinite(byte) || byte <= 0) return ''
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`
}

function BarisStatus({ status }) {
  const isApproved = isLeaveApproved(status)
  const isRejected = isLeaveRejected(status)
  const warna = isApproved
    ? 'bg-status-success-soft text-status-success-text'
    : isRejected
    ? 'bg-status-danger-soft text-status-danger-text'
    : 'bg-status-warning-soft text-status-warning-text'
  return (
    <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm ${warna}`}>
      {LABEL_STATUS_PANJANG[status] || status}
    </span>
  )
}

/**
 * Form pengajuan. Dipisah dari halaman supaya form bisa diuji terpisah dari
 * keadaan "tombol sudah ditekan atau belum".
 *
 * Isinya: jenis pengajuan (dikelompokkan Cuti / Izin), tanggal mulai dan
 * selesai beserta durasinya, alasan, dan lampiran dokumen. Aturan lampiran
 * mengikuti jenis terpilih — "Lampiran wajib" hanya untuk Cuti Melquear.
 */
export function FormPengajuan({
  jenis, mulai, selesai, alasan, lampiran, galat, mengirim, durasi, inputLampiran,
  onUbahJenis, onUbahMulai, onUbahSelesai, onUbahAlasan, onUbahBerkas, onBatal, onKirim, onHapusLampiran,
}) {
  const aturan = aturanLampiran(jenis)

  return (
    <form onSubmit={onKirim} className="sp-card p-4 flex flex-col gap-4 animate-sp-rise" noValidate>
      <div className="flex items-center justify-between gap-2">
        <span className="font-headline-sm text-headline-sm text-on-surface">Form Pengajuan</span>
        <button
          type="button"
          onClick={onBatal}
          className="sp-press flex items-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant"
        >
          <Icon name="close" className="text-[16px] shrink-0" />
          <span className="font-label-sm text-label-sm">Batalkan</span>
        </button>
      </div>

      <div>
        <span className={LABEL}>Jenis Pengajuan</span>
        <div className="flex flex-col gap-3">
          {JENIS_TERGROUP.map((grup) => (
            <div key={grup.kelompok} className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{grup.nama}</span>
              <div className="flex flex-wrap gap-2">
                {grup.opsi.map((item) => {
                  const aktif = item === jenis
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onUbahJenis(item)}
                      aria-pressed={aktif}
                      className={`px-3.5 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                        aktif
                          ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                          : 'border-slate-200/80 dark:border-primary-border bg-slate-50 dark:bg-card text-slate-700 dark:text-foreground hover:bg-slate-100 dark:hover:bg-primary-soft'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-label-md text-label-md">
                        <Icon name={ikonJenis(item)} className="text-[16px] shrink-0" />
                        {item}
                      </span>
                      {aturanLampiran(item) === 'wajib' && (
                        <span className="block font-label-sm text-label-sm text-status-danger-text mt-1">Lampiran wajib</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="izin-mulai">Tanggal mulai</label>
          <input id="izin-mulai" type="date" value={mulai} onChange={(e) => onUbahMulai(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL} htmlFor="izin-selesai">Tanggal selesai</label>
          <input
            id="izin-selesai"
            type="date"
            value={selesai}
            min={mulai}
            onChange={(e) => onUbahSelesai(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>
      <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
        Durasi: <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{durasi} hari</span>
        {mulai && selesai && ` • ${formatPeriode(mulai, selesai)}`}
      </p>

      <div>
        <label className={LABEL} htmlFor="izin-alasan">
          Alasan <span className="text-status-danger-text">*</span>
        </label>
        <textarea
          id="izin-alasan"
          rows={3}
          value={alasan}
          onChange={(e) => onUbahAlasan(e.target.value)}
          placeholder="Contoh: perlu istirahat sesuai surat dokter, acara keluarga, surat tugas dinas…"
          className={`${FIELD} resize-none`}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="izin-lampiran">
          Lampiran dokumen
          {aturan === 'wajib' && <span className="text-status-danger-text"> *</span>}
          {aturan === 'disarankan' && <span className="text-on-surface-variant"> (disarankan)</span>}
        </label>
        <div className="flex flex-col gap-2">
          <input
            ref={inputLampiran}
            id="izin-lampiran"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={onUbahBerkas}
            className="w-full text-body-sm text-body-sm text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-surface-container file:px-3.5 file:py-2.5 file:font-label-md file:text-label-md file:text-on-surface"
          />
          {lampiran && (
            <p className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
              <Icon name="attach_file" className="text-[15px] shrink-0" />
              <span className="truncate">{lampiran.name}</span>
              <span className="shrink-0">{ukuranBerkas(lampiran.size)}</span>
              <button type="button" onClick={onHapusLampiran} className="shrink-0 -mr-2 px-2 py-1.5 rounded-lg text-status-danger-text font-label-sm text-label-sm">
                Hapus
              </button>
            </p>
          )}
        </div>
      </div>

      {galat && (
        <p role="alert" className="rounded-2xl bg-status-danger-soft text-status-danger-bright border border-status-danger-border px-3.5 py-3 font-body-sm text-body-sm flex items-start gap-2 leading-snug">
          <Icon name="error" className="text-[16px] mt-0.5 shrink-0" />
          <span>{galat}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={mengirim}
        className="sp-btn w-full py-3.5 bg-primary hover:bg-primary-strong text-white font-headline-sm text-headline-sm flex items-center justify-center gap-2 rounded-xl shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {mengirim && <Spinner />}
        {mengirim ? 'Mengirim...' : 'Kirim Pengajuan'}
      </button>
    </form>
  )
}

/**
 * Pengajuan Izin/Cuti versi mobile.
 *
 * Alur: tombol utama "+ Buat Pengajuan" membuka form, form memvalidasi
 * sebelum mengirim, dan hasil kirim memakai buildPengajuan() yang sama dengan
 * modal portal admin. Pengajuan baru langsung masuk ke tabel `leaves` — tabel
 * yang sama dibaca dashboard admin unit, rekap izin/cuti, dan log aktivitas,
 * jadi tidak ada jalur data terpisah yang perlu disinkronkan.
 */
function MobileIzinCutiPage() {
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const dispatch = ctx?.dispatch ?? null
  const staff = state ? selectSelfStaff(state) : null
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const daftar = useMemo(() => (state ? selectSelfLeaves(state) : []), [state])

  const currentRole = state ? selectCurrentUserRole(state) : ''
  const isSuperadmin = currentRole === ROLE_SUPERADMIN
  const isKepsek = currentRole === ROLE_KEPALA_SEKOLAH

  const [formTerbuka, setFormTerbuka] = useState(false)
  const [jenis, setJenis] = useState('Cuti Tahunan')
  const [mulai, setMulai] = useState(() => isoHariIni())
  const [selesai, setSelesai] = useState(() => isoHariIni())
  const [alasan, setAlasan] = useState('')
  const [lampiran, setLampiran] = useState(null)
  const [pesan, setPesan] = useState('')
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [selectedLeaveDoc, setSelectedLeaveDoc] = useState(null)
  const inputLampiran = useRef(null)

  const durasi = hitungDurasiHari(mulai, selesai)

  function resetForm() {
    setJenis('Cuti Tahunan')
    setMulai(isoHariIni())
    setSelesai(isoHariIni())
    setAlasan('')
    setLampiran(null)
    setGalat('')
  }

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading Pengajuan Izin/Cuti" detail="Mengambil data pengajuan Anda…" />
      </div>
    )
  }

  if (!staff) {
    if (isSuperadmin) {
      return (
        <div className="sp-page sp-page-container py-6 flex flex-col gap-4">
          <div className="sp-card p-6 flex flex-col items-center text-center gap-3.5 border border-primary/20">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-2xs">
              <Icon name="verified_user" className="text-[32px]" />
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-foreground">Portal Persetujuan Superadmin</h2>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                Sebagai Superadmin Yayasan, Anda memiliki wewenang meninjau dan menyetujui seluruh permohonan izin/cuti pegawai dari seluruh unit sekolah.
              </p>
            </div>
            <Link
              to="/mobile/persetujuan-izin"
              className="mt-2 w-full max-w-xs py-3 rounded-xl bg-primary hover:bg-primary-strong text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <Icon name="task_alt" className="text-[18px]" />
              <span>Buka Persetujuan Izin Pegawai</span>
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="sp-page-container py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="Pengajuan hanya bisa dibuat untuk akun yang terhubung ke data pegawai."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }

  const jumlah = (status) => {
    if (status === 'Menunggu') return daftar.filter((l) => isLeavePending(l.status)).length
    if (status === 'Disetujui') return daftar.filter((l) => isLeaveApproved(l.status)).length
    if (status === 'Ditolak') return daftar.filter((l) => isLeaveRejected(l.status)).length
    return daftar.filter((l) => l.status === status).length
  }

  /** Validasi form: aturan sama dengan modal portal admin (modul data). */
  function validasi() {
    return validasiFormPengajuan({ jenis, mulai, selesai, alasan, lampiran })
  }

  function pilihBerkas(event) {
    const berkas = event.target.files?.[0] || null
    setLampiran(berkas)
    setGalat(berkas && berkas.size > MAKS_LAMPIRAN ? 'Ukuran lampiran maksimal 5 MB.' : '')
  }

  async function kirim(event) {
    event.preventDefault()
    const pesanValidasi = validasi()
    if (pesanValidasi) {
      setGalat(pesanValidasi)
      return
    }
    setMengirim(true)
    setGalat('')

    let fileMeta = {
      lampiran: lampiran?.name || '',
      lampiranUrl: '',
      lampiranNama: lampiran?.name || '',
      lampiranUkuran: lampiran?.size ?? null,
      lampiranTipe: lampiran?.type || '',
    }

    if (lampiran) {
      const uploadRes = await uploadLeaveAttachment(lampiran, {
        staffId: staff.id,
        unitId: staff.unitId,
      })
      if (!uploadRes.success && uploadRes.error) {
        setGalat(uploadRes.error)
        setMengirim(false)
        return
      }
      fileMeta = {
        lampiran: uploadRes.fileName || lampiran.name,
        lampiranUrl: uploadRes.url || '',
        lampiranNama: uploadRes.fileName || lampiran.name,
        lampiranUkuran: uploadRes.fileSize || lampiran.size,
        lampiranTipe: uploadRes.fileType || lampiran.type,
      }
    }

    const idBaru = state.leaves.length ? Math.max(...state.leaves.map((l) => l.id)) + 1 : 1
    const basePengajuan = buildPengajuan({
      id: idBaru,
      staffId: staff.id,
      jenis,
      mulai,
      selesai,
      alasan,
      lampiran: fileMeta.lampiranNama || fileMeta.lampiran,
      lampiranUkuran: fileMeta.lampiranUkuran,
    })

    const pengajuan = {
      ...basePengajuan,
      ...fileMeta,
      lampiran_url: fileMeta.lampiranUrl,
      lampiran_nama: fileMeta.lampiranNama,
      lampiran_tipe: fileMeta.lampiranTipe,
      lampiran_ukuran: fileMeta.lampiranUkuran,
    }

    dispatch({ type: 'ADD_LEAVE', payload: pengajuan })
    addActivityLog(
      dispatch,
      state,
      'Pengajuan',
      `Cuti/Izin • ${staff.name}`,
      `${getEmployeeGreeting(staff, { unit })} mengajukan ${pengajuan.jenis} (${pengajuan.durasi}): ${pengajuan.keterangan}`,
      null,
      null,
      staff.unitId,
    )

    resetForm()
    if (inputLampiran.current) inputLampiran.current.value = ''
    setMengirim(false)
    setFormTerbuka(false)
    setPesan(`Pengajuan ${pengajuan.jenis} terkirim dan menunggu persetujuan Kepala Unit.`)
  }

  return (
    <div className="sp-page">
      <section className="sp-hero sp-page-container pt-3.5 pb-3">
        {/* Ringkasan statistik pengajuan: permukaan soft blue agar terpisah
            dari area riwayat (putih) dan tombol aksi (navy) di bawahnya. */}
        <div className="sp-card p-4 flex flex-col gap-3.5 border border-primary/20 rounded-2xl" style={{ backgroundColor: 'var(--primary-soft)' }}>
          <div className="flex items-center gap-3">
            <StaffAvatar staff={staff} size="w-12 h-12" textClass="font-headline-sm text-headline-sm font-bold text-white" ring="ring-2 ring-white/60" className="shadow-xs" />
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-primary-muted font-medium">Pengajuan Saya</span>
              <h1 className="font-headline-sm text-headline-sm text-sp-ink font-bold tracking-tight">Izin &amp; Cuti</h1>
              <span className="font-label-sm text-label-sm text-primary-muted truncate">{unit?.nama}</span>
            </div>
          </div>

          {/* Ringkasan tiga status pengajuan. */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {STATUS_PENGAJUAN.map((status) => (
              <div key={status} className="rounded-xl bg-sp-surface border border-primary-border p-3 flex flex-col items-center gap-0.5 min-w-0">
                <span
                  className={`font-display-lg-mobile text-[22px] font-bold leading-none ${
                    status === 'Menunggu' ? 'text-status-warning-text' : status === 'Disetujui' ? 'text-status-success-text' : 'text-status-danger-text'
                  }`}
                >
                  {jumlah(status)}
                </span>
                <span className="font-label-sm text-[11px] text-primary-muted text-center font-medium mt-0.5">
                  {LABEL_STATUS_PANJANG[status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4 pb-2">
        {(isSuperadmin || isKepsek) && (
          <Link
            to="/mobile/persetujuan-izin"
            className="p-3.5 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/25 flex items-center justify-between gap-2.5 transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                <Icon name="task_alt" className="text-[20px]" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs text-foreground block truncate">
                  Persetujuan Izin &amp; Cuti Pegawai
                </span>
                <span className="text-[11px] text-muted-foreground block truncate">
                  {isSuperadmin ? 'Verifikasi seluruh pengajuan unit sekolah' : 'Verifikasi pengajuan staf unit Anda'}
                </span>
              </div>
            </div>
            <Icon name="chevron_right" className="text-[20px] text-primary shrink-0" />
          </Link>
        )}

        {!formTerbuka && (
          <button
            type="button"
            onClick={() => {
              setFormTerbuka(true)
              setPesan('')
              setGalat('')
            }}
            className="sp-btn w-full min-h-[60px] py-3.5 bg-primary bg-[#323d8f] hover:bg-primary-strong text-white border-[3px] border-primary shadow-lg shadow-[var(--primary)]/20 font-headline-sm text-headline-sm flex items-center justify-center gap-2 rounded-2xl active:scale-[0.98] transition-all"
          >
            <Icon name="add" className="text-[22px] shrink-0 text-white" />
            <span className="text-white font-semibold tracking-wide">Buat Pengajuan</span>
          </button>
        )}

        {pesan && (
          <p className="rounded-2xl bg-status-success-soft text-status-success-bright border border-status-success-border px-3.5 py-3 font-body-sm text-body-sm flex items-start gap-2 leading-snug">
            <Icon name="check_circle" className="text-[16px] mt-0.5 shrink-0" />
            <span>{pesan}</span>
          </p>
        )}

        {formTerbuka && (
          <FormPengajuan
            jenis={jenis}
            mulai={mulai}
            selesai={selesai}
            alasan={alasan}
            lampiran={lampiran}
            galat={galat}
            mengirim={mengirim}
            durasi={durasi}
            inputLampiran={inputLampiran}
            onUbahJenis={setJenis}
            onUbahMulai={(v) => {
              setMulai(v)
              if (selesai < v) setSelesai(v)
            }}
            onUbahSelesai={setSelesai}
            onUbahAlasan={setAlasan}
            onUbahBerkas={pilihBerkas}
            onHapusLampiran={() => {
              setLampiran(null)
              if (inputLampiran.current) inputLampiran.current.value = ''
            }}
            onBatal={() => {
              setFormTerbuka(false)
              setGalat('')
            }}
            onKirim={kirim}
          />
        )}

        <section className="sp-card p-4">
          <SectionTitle ikon="event_available" judul="Sisa Kuota Cuti" />
          <div className="grid grid-cols-3 gap-2 mt-2">
            {['Cuti Tahunan', 'Cuti Menikah', 'Cuti Melahirkan'].map((j) => (
              <div key={j} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 dark:bg-card border border-slate-200/60 dark:border-primary-border">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{j.replace('Cuti ', '')}</span>
                <span className="font-headline-md text-headline-md text-primary">{hitungSisaKuota(staff?.id, j, daftar)}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">dari {kuotaJenis(j)} hari</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <SectionTitle
            ikon="history"
            judul="Riwayat Pengajuan"
            aksi={<span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{daftar.length} pengajuan</span>}
          />
          {daftar.length ? (
            <ul className="flex flex-col gap-2.5">
              {daftar.map((item) => {
                const detail = jenisIzinCuti(item.jenis)
                return (
                  <li key={item.id} className="sp-list-card flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2.5">
                      <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 min-w-0 ${warnaJenis(item.jenis)}`}>
                        <Icon name={ikonJenis(item.jenis)} className="text-[13px] shrink-0" />
                        <span className="truncate">{item.jenis}</span>
                      </span>
                      <BarisStatus status={item.status} />
                    </div>
                    {item.status === 'Menunggu Superadmin' && (
                      <p className="text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 flex items-center gap-1.5">
                        <Icon name="verified" className="text-[14px] text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>Disetujui Kepala Sekolah • Menunggu persetujuan Superadmin</span>
                      </p>
                    )}
                    {item.status === 'Menunggu Kepsek' && (
                      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                        <Icon name="hourglass_empty" className="text-[14px] text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Menunggu peninjauan &amp; persetujuan Kepala Sekolah</span>
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-on-surface-variant flex-wrap">
                      <Icon name="event" className="text-[15px] shrink-0" />
                      <span className="font-body-sm text-body-sm text-on-surface">{item.periode}</span>
                      <span className="font-label-sm text-label-sm">• {item.durasi}</span>
                      {detail && (
                        <span className="font-label-sm text-label-sm">• {detail.kelompok}</span>
                      )}
                    </div>
                    {(item.keterangan || item.alasan) && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">{item.keterangan || item.alasan}</p>
                    )}
                    {(item.lampiran || item.lampiranUrl || item.lampiran_url) && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-card border border-slate-200/80 dark:border-primary-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon name="attach_file" className="text-[17px] text-primary shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-xs block truncate">
                              {getAttachmentName(item) || 'Surat Pengajuan Izin / Cuti'}
                            </span>
                            <span className="text-[10.5px] text-muted-foreground block">
                              {item.lampiranUkuran || item.lampiran_ukuran
                                ? ukuranBerkas(item.lampiranUkuran || item.lampiran_ukuran)
                                : 'Surat Bukti Lampiran'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedLeaveDoc(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          title={`Lihat surat: ${getAttachmentName(item) || 'lampiran'}`}
                        >
                          <Icon name="visibility" className="text-[14px]" />
                          <span>Lihat Surat</span>
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="sp-card p-4">
              <EmptyState
                ikon="event_available"
                judul="Belum ada pengajuan"
                detail="Tekan tombol Buat Pengajuan untuk mengirim izin atau cuti. Pengajuan masuk ke antrean persetujuan Kepala Unit."
              />
            </div>
          )}
        </section>
      </div>

      {/* Modal Pratinjau Surat Izin untuk Guru/Pegawai */}
      <DocumentViewerModal
        isOpen={Boolean(selectedLeaveDoc)}
        onClose={() => setSelectedLeaveDoc(null)}
        leave={selectedLeaveDoc}
      />
    </div>
  )
}

export default MobileIzinCutiPage