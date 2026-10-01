import { Component } from 'react'
import { ErrorState } from './Feedback.jsx'

/**
 * Pagar kesalahan untuk modul mobile. Aplikasi native tidak pernah menampilkan
 * layar putih: kalau sebuah halaman gagal dirender, pengguna mendapat kartu
 * error dengan aksi memuat ulang, bukan layar buntu.
 */
class MobileErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Dicatat ke console agar mudah ditelusuri saat pengembangan.
    console.error('[SimPres Mobile] render gagal:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="px-4 py-6">
        <ErrorState
          judul="Halaman gagal dimuat"
          detail="Terjadi kesalahan saat menampilkan halaman ini. Muat ulang untuk mencoba lagi."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }
}

export default MobileErrorBoundary