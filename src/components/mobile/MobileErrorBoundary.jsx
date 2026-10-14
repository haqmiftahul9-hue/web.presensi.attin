import { Component } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from './Feedback.jsx'

/**
 * Pagar kesalahan untuk modul mobile. Aplikasi native tidak pernah menampilkan
 * layar putih: kalau sebuah halaman gagal dirender, pengguna mendapat kartu
 * error dengan jalan keluar, bukan layar buntu.
 *
 * `resetKey` (pathname) wajib diteruskan oleh induknya. Tanpa itu, satu halaman
 * yang gagal akan mengunci SELURUH modul: pagar ini mengingat error-nya dan
 * setiap halaman yang dibuka sesudahnya hanya menampilkan "Halaman gagal
 * dimuat" — bottom navigation jadi tidak bisa dipakai. Reset berdasarkan path
 * membuat pindah tab langsung kembali ke halaman yang berfungsi, tanpa reload.
 */
class MobileErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, resetKey: props.resetKey ?? null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    const key = props.resetKey ?? null
    // Path berubah -> clear the error so a new page can still render.
    if (key !== state.resetKey) return { resetKey: key, error: null }
    return null
  }

  componentDidCatch(error, info) {
    // Dicatat ke console agar mudah ditelusuri saat pengembangan.
    console.error('[SimPres Mobile] render gagal:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="px-4 py-6 flex flex-col gap-3">
        <ErrorState
          judul="Halaman gagal dimuat"
          detail="Terjadi kesalahan saat menampilkan halaman ini. Pilih tab lain di bawah atau muat ulang."
          onCoba={() => this.setState({ error: null })}
        />
        <Link
          to="/mobile/home"
          className="sp-press self-center px-4 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5"
        >
          Kembali ke Beranda
        </Link>
      </div>
    )
  }
}

export default MobileErrorBoundary
