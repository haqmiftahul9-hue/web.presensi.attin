import { useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import {
  useSimPresOptional, selectSelfStaff, selectSelfLeaves, selectUnitById, addActivityLog,
} from '../../store/simPresStore.jsx'
import { isoHariIni } from '../../data/presensiMobile.js'
import { getEmployeeGreeting } from '../../data/sapaanPegawai.js'
import {
  JENIS_FORM, jenisIzinCuti, kelompokIzinCuti, aturanLampiran, ikonJenis,
  warnaJenis, WARNA_STATUS, LABEL_STATUS_PANJANG, STATUS_PENGAJUAN,
  buildPengajuan, validasiFormPengajuan, formatPeriode, hitungDurasiHari,
  MAKS_LAMPIRAN,
} from '../../data/jenisIzinCuti.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { SectionTitle } from '../../components/mobile/AppShell.jsx'
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../components/mobile/Feedback.jsx'

const FIELD =
  'sp-field px-3 py-3 bg-surface-container-low border border-outline-variant/50 text-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20'
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
  return (
    <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm ${WARNA_STATUS[status] || WARNA_STATUS.Menunggu}`}>
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
                      className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                        aktif
                          ? 'border-secondary bg-secondary-container text-on-secondary-container'
                          : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-label-md text-label-md">
                        <Icon name={ikonJenis(item)} className="text-[16px] shrink-0" />
                        {item}
                      </span>
                      {aturanLampiran(item) === 'wajib' && (
                        <span className="block font-label-sm text-label-sm text-rose-700 mt-1">Lampiran wajib</span>
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
          Alasan <span className="text-rose-700">*</span>
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
          {aturan === 'wajib' && <span className="text-rose-700"> *</span>}
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
              <button type="button" onClick={onHapusLampiran} className="shrink-0 -mr-2 px-2 py-1.5 rounded-lg text-rose-700 font-label-sm text-label-sm">
                Hapus
              </button>
            </p>
          )}
        </div>
      </div>

      {galat && (
        <p role="alert" className="rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 px-3.5 py-3 font-body-sm text-body-sm flex items-start gap-2 leading-snug">
          <Icon name="error" className="text-[16px] mt-0.5 shrink-0" />
          <span>{galat}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={mengirim}
        className="sp-btn w-full py-3.5 bg-primary text-on-primary border-2 border-outline font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform disabled:opacity-60"
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

  const [formTerbuka, setFormTerbuka] = useState(false)
  const [jenis, setJenis] = useState('Cuti Tahunan')
  const [mulai, setMulai] = useState(() => isoHariIni())
  const [selesai, setSelesai] = useState(() => isoHariIni())
  const [alasan, setAlasan] = useState('')
  const [lampiran, setLampiran] = useState(null)
  const [pesan, setPesan] = useState('')
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)
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

  const jumlah = (status) => daftar.filter((l) => l.status === status).length

  /** Validasi form: aturan sama dengan modal portal admin (modul data). */
  function validasi() {
    return validasiFormPengajuan({ jenis, mulai, selesai, alasan, lampiran })
  }

  function pilihBerkas(event) {
    const berkas = event.target.files?.[0] || null
    setLampiran(berkas)
    setGalat(berkas && berkas.size > MAKS_LAMPIRAN ? 'Ukuran lampiran maksimal 5 MB.' : '')
  }

  function kirim(event) {
    event.preventDefault()
    const pesanValidasi = validasi()
    if (pesanValidasi) {
      setGalat(pesanValidasi)
      return
    }
    setMengirim(true)
    setGalat('')

    const idBaru = state.leaves.length ? Math.max(...state.leaves.map((l) => l.id)) + 1 : 1
    const pengajuan = buildPengajuan({
      id: idBaru,
      staffId: staff.id,
      jenis,
      mulai,
      selesai,
      alasan,
      lampiran: lampiran?.name || '',
      lampiranUkuran: lampiran?.size ?? null,
    })

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
      <section className="sp-hero sp-page-container pt-4 pb-6">
        <span className="sp-pattern-dots" aria-hidden="true" />
        <span className="sp-blob sp-blob-a" aria-hidden="true" />
        <div className="relative z-[1]">
        <div className="flex items-center gap-3">
          <StaffAvatar staff={staff} size="w-12 h-12" textClass="font-headline-sm text-headline-sm" />
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-primary-container">Pengajuan Saya</span>
            <h1 className="font-headline-sm text-headline-sm text-white">Izin &amp; Cuti</h1>
            <span className="font-label-sm text-label-sm text-on-primary-container truncate">{unit?.nama}</span>
          </div>
        </div>

        {/* Ringkasan tiga status pengajuan. */}
        <div className="mt-4 flex items-center">
          {STATUS_PENGAJUAN.map((status, i) => (
            <div
              key={status}
              className={`flex-1 flex flex-col items-center gap-0.5 ${i > 0 ? 'border-l border-white/10' : ''}`}
            >
              <span
                className={`font-display-lg-mobile text-display-lg-mobile leading-none ${
                  status === 'Menunggu' ? 'text-amber-300' : status === 'Disetujui' ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {jumlah(status)}
              </span>
              <span className="font-label-sm text-label-sm text-white/70 text-center">
                {LABEL_STATUS_PANJANG[status]}
              </span>
            </div>
          ))}
        </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4 pb-2">
        {/*
          Tombol utama pengajuan. Sengaja dibuat besar, full width, dengan
          border putih tebal dan warna biru kontras terhadap header gelap di
          atasnya: ini aksi paling penting di halaman ini dan harus langsung
          terlihat tanpa harus mencari.
        */}
        {!formTerbuka && (
          <button
            type="button"
            onClick={() => {
              setFormTerbuka(true)
              setPesan('')
              setGalat('')
            }}
            className="sp-btn w-full min-h-[60px] py-4 bg-gradient-to-r from-[#1c2254] via-[#20275e] to-[#323d8f] text-white border-[3px] border-[#323d8f]/40 shadow-lg shadow-blue-950/20 font-headline-sm text-headline-sm flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all hover:brightness-105"
          >
            <Icon name="add" className="text-[26px] shrink-0 text-white" />
            <span className="text-white font-semibold tracking-wide">Buat Pengajuan</span>
          </button>
        )}

        {pesan && (
          <p className="rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-3 font-body-sm text-body-sm flex items-start gap-2 leading-snug">
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
                    {item.lampiran && (
                      <p className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                        <Icon name="attach_file" className="text-[15px] shrink-0" />
                        <span className="truncate">{item.lampiran}</span>
                        {item.lampiranUkuran ? <span className="shrink-0">• {ukuranBerkas(item.lampiranUkuran)}</span> : null}
                      </p>
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
    </div>
  )
}

export default MobileIzinCutiPage