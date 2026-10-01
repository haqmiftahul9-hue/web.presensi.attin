import { useMemo, useState } from 'react'
import {
  useSimPres, selectSelfStaff, selectSelfLeaves, selectUnitById, addActivityLog,
} from '../../store/simPresStore.jsx'
import { isoHariIni } from '../../data/presensiMobile.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { EmptyState, ErrorState, Spinner } from '../../components/mobile/Feedback.jsx'

const JENIS = ['Sakit', 'Izin Pribadi', 'Cuti Penting', 'Cuti Menikah', 'Tugas Luar']
const LABEL_STATUS = {
  Menunggu: 'bg-amber-50 text-amber-800',
  Disetujui: 'bg-emerald-50 text-emerald-700',
  Ditolak: 'bg-error-container text-on-error-container',
}
const LABEL_JENIS = {
  'Sakit': 'bg-emerald-100 text-emerald-900',
  'Izin Pribadi': 'bg-amber-100 text-amber-900',
  'Cuti Penting': 'bg-blue-100 text-blue-900',
  'Cuti Menikah': 'bg-rose-100 text-rose-900',
  'Tugas Luar': 'bg-secondary-fixed text-on-secondary-fixed',
}

// Field input seragam untuk form mobile.
const FIELD =
  'w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20'
const LABEL = 'font-label-sm text-label-sm text-on-surface-variant mb-1 block'

function hitungDurasi(mulai, selesai) {
  if (!mulai || !selesai) return '1 Hari'
  const selisih = Math.round((new Date(selesai) - new Date(mulai)) / 86400000) + 1
  return `${Math.max(1, selisih)} Hari`
}

/**
 * Pengajuan Izin/Cuti versi mobile: daftar pengajuan milik pegawai sendiri plus
 * form pengajuan. Pengajuan baru langsung masuk ke tabel `leaves` yang sama
 * dengan portal, jadi Kepala Unit langsung melihatnya di halaman yang sama.
 */
function MobileIzinCutiPage() {
  const { state, dispatch } = useSimPres()
  const staff = selectSelfStaff(state)
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const [formTerbuka, setFormTerbuka] = useState(false)
  const [jenis, setJenis] = useState(JENIS[0])
  const [mulai, setMulai] = useState(() => isoHariIni())
  const [selesai, setSelesai] = useState(() => isoHariIni())
  const [keterangan, setKeterangan] = useState('')
  const [pesan, setPesan] = useState('')
  const [mengirim, setMengirim] = useState(false)

  const daftar = useMemo(() => selectSelfLeaves(state), [state])

  if (!staff) {
    return (
      <div className="px-4 py-6">
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

  function kirim(event) {
    event.preventDefault()
    if (!keterangan.trim()) {
      setPesan('Keterangan wajib diisi agar pengajuan bisa ditinjau.')
      return
    }
    if (selesai < mulai) {
      setPesan('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.')
      return
    }
    setMengirim(true)
    setPesan('')
    const idBaru = state.leaves.length ? Math.max(...state.leaves.map((l) => l.id)) + 1 : 1
    const periode = mulai === selesai ? formatTanggalPendek(mulai) : `${formatTanggalPendek(mulai)} - ${formatTanggalPendek(selesai)}`
    dispatch({
      type: 'ADD_LEAVE',
      payload: {
        id: idBaru,
        staffId: staff.id,
        jenis,
        periode,
        durasi: hitungDurasi(mulai, selesai),
        lampiran: '',
        keterangan: keterangan.trim(),
        status: 'Menunggu',
      },
    })
    addActivityLog(
      dispatch,
      state,
      'Pengajuan',
      `Cuti/Izin • ${staff.name}`,
      `${staff.name} mengajukan ${jenis} (${hitungDurasi(mulai, selesai)}): ${keterangan.trim()}`,
    )
    setKeterangan('')
    setFormTerbuka(false)
    setMengirim(false)
    setPesan('Pengajuan terkirim dan menunggu persetujuan Kepala Unit.')
  }

  return (
    <div className="sp-page">
      <section className="bg-primary-container text-on-primary px-4 pt-4 pb-7 rounded-b-[28px] shadow-md">
        <div className="flex items-center gap-3">
          <StaffAvatar staff={staff} size="w-12 h-12" textClass="font-headline-sm text-headline-sm" />
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-primary-container">Pengajuan Saya</span>
            <h1 className="font-headline-sm text-headline-sm text-white">Izin &amp; Cuti</h1>
            <span className="font-label-sm text-label-sm text-on-primary-container truncate">{unit?.nama}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center">
          {[
            { label: 'Menunggu', nilai: jumlah('Menunggu'), tone: 'text-amber-300' },
            { label: 'Disetujui', nilai: jumlah('Disetujui'), tone: 'text-emerald-300' },
            { label: 'Ditolak', nilai: jumlah('Ditolak'), tone: 'text-rose-300' },
          ].map((item, i) => (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-0.5">
              {i > 0 && <span className="sr-only">|</span>}
              <span className={`font-display-lg-mobile text-display-lg-mobile leading-none ${item.tone}`}>
                {item.nilai}
              </span>
              <span className="font-label-sm text-label-sm text-on-primary-container">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="px-4 -mt-4 relative z-20 flex flex-col gap-4 pb-6">
        <button
          type="button"
          onClick={() => setFormTerbuka((v) => !v)}
          className="w-full py-3.5 rounded-2xl bg-primary-container text-on-primary font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">{formTerbuka ? 'close' : 'add'}</span>
          {formTerbuka ? 'Batalkan' : 'Buat Pengajuan'}
        </button>

        {pesan && (
          <p className="rounded-2xl bg-surface-container-low text-on-surface px-3.5 py-2.5 font-body-sm text-body-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] mt-0.5 text-secondary">info</span>
            <span>{pesan}</span>
          </p>
        )}

        {formTerbuka && (
          <form onSubmit={kirim} className="sp-card p-4 flex flex-col gap-3 animate-sp-rise">
            <div>
              <label className={LABEL} htmlFor="izin-jenis">Jenis Pengajuan</label>
              <select
                id="izin-jenis"
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
                className={FIELD}
              >
                {JENIS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL} htmlFor="izin-mulai">Mulai</label>
                <input id="izin-mulai" type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="izin-selesai">Selesai</label>
                <input id="izin-selesai" type="date" value={selesai} min={mulai} onChange={(e) => setSelesai(e.target.value)} className={FIELD} />
              </div>
            </div>
            <div>
              <label className={LABEL} htmlFor="izin-keterangan">Keterangan</label>
              <textarea
                id="izin-keterangan"
                rows={3}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: melampirkan surat dokter, acara keluarga, tugas luar unit…"
                className={`${FIELD} resize-none`}
              />
            </div>
            <button
              type="submit"
              disabled={mengirim}
              className="w-full py-3 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-70"
            >
              {mengirim && <Spinner />}
              {mengirim ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          </form>
        )}

        <section className="sp-card p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="font-headline-sm text-headline-sm text-on-surface">Riwayat Pengajuan</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{daftar.length} pengajuan</span>
          </div>
          {daftar.length ? (
            <ul className="divide-y divide-surface-container">
              {daftar.map((item) => (
                <li key={item.id} className="py-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${LABEL_JENIS[item.jenis] || 'bg-surface-container text-on-surface'}`}>
                      {item.jenis}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${LABEL_STATUS[item.status] || LABEL_STATUS.Menunggu}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[15px]">event</span>
                    <span className="font-body-sm text-body-sm text-on-surface">{item.periode}</span>
                    <span className="font-label-sm text-label-sm">• {item.durasi}</span>
                  </div>
                  {item.keterangan && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{item.keterangan}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              ikon="event_available"
              judul="Belum ada pengajuan"
              detail="Ajukan izin atau cuti melalui tombol di atas. Pengajuan masuk ke antrean persetujuan Kepala Unit."
            />
          )}
        </section>
      </div>
    </div>
  )
}

function formatTanggalPendek(iso) {
  const [tahun, bulan, tanggal] = String(iso).split('-').map(Number)
  const bulanNama = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${String(tanggal).padStart(2, '0')} ${bulanNama[(bulan || 1) - 1]} ${tahun}`
}

export default MobileIzinCutiPage
