import { useEffect, useState } from 'react'

export default function AppSplash({ show, onDone, duration = 1600 }) {
  const [visible, setVisible] = useState(show)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!show) {
      setLeaving(true)
      const t = setTimeout(() => {
        setVisible(false)
        onDone?.()
      }, 420)
      return () => clearTimeout(t)
    }
    setVisible(true)
    setLeaving(false)
    const t = setTimeout(() => {
      setLeaving(true)
      const t2 = setTimeout(() => {
        setVisible(false)
        onDone?.()
      }, 420)
    }, duration)
    return () => clearTimeout(t)
  }, [show, duration, onDone])

  if (!visible) return null

  return (
    <div
      className={`sp-app-splash ${leaving ? 'sp-app-splash-leave' : ''}`}
      role="status"
      aria-label="Memuat SIMPEG"
    >
      <style>{`
        .sp-app-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 18px;
          background: radial-gradient(ellipse at 50% 30%, #3b469e 0%, #323d8f 45%, #1c2254 100%);
          transition: opacity .42s cubic-bezier(.4,0,.2,1), transform .42s cubic-bezier(.4,0,.2,1);
        }
        .sp-app-splash-leave {
          opacity: 0;
          transform: scale(1.03);
          pointer-events: none;
        }
        .sp-splash-logo-wrap {
          position: relative;
          width: 112px;
          height: 112px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: sp-splash-pop .7s cubic-bezier(.22,1,.36,1) both;
        }
        .sp-splash-ring {
          position: absolute;
          inset: -10px;
          border-radius: 28px;
          border: 2px solid rgba(255,255,255,.28);
          animation: sp-splash-ring 1.4s ease-out .15s both;
        }
        .sp-splash-ring-2 {
          position: absolute;
          inset: -22px;
          border-radius: 34px;
          border: 1.5px solid rgba(255,255,255,.12);
          animation: sp-splash-ring 1.6s ease-out .3s both;
        }
        .sp-splash-logo {
          width: 96px;
          height: 96px;
          border-radius: 24px;
          background: #fff;
          padding: 10px;
          box-shadow: 0 18px 40px -12px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.15);
          object-fit: contain;
        }
        .sp-splash-title {
          color: #fff;
          font: 700 22px/1.1 Inter, system-ui, -apple-system, sans-serif;
          letter-spacing: .04em;
          animation: sp-splash-fade .6s ease .25s both;
        }
        .sp-splash-sub {
          color: rgba(255,255,255,.75);
          font: 500 12px/1.3 Inter, system-ui, -apple-system, sans-serif;
          margin-top: -10px;
          animation: sp-splash-fade .6s ease .35s both;
        }
        .sp-splash-bar {
          position: absolute;
          bottom: 18%;
          width: 120px;
          height: 3px;
          border-radius: 999px;
          background: rgba(255,255,255,.18);
          overflow: hidden;
        }
        .sp-splash-bar::after {
          content: '';
          display: block;
          height: 100%;
          width: 45%;
          border-radius: 999px;
          background: rgba(255,255,255,.85);
          animation: sp-splash-slide 1.1s ease-in-out infinite;
        }
        @keyframes sp-splash-pop {
          0% { opacity: 0; transform: scale(.72) translateY(12px); }
          60% { opacity: 1; transform: scale(1.04) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes sp-splash-ring {
          0% { opacity: 0; transform: scale(.85); }
          40% { opacity: 1; }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sp-splash-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sp-splash-slide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sp-app-splash, .sp-splash-logo-wrap, .sp-splash-ring, .sp-splash-ring-2,
          .sp-splash-title, .sp-splash-sub, .sp-splash-bar::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <div className="sp-splash-logo-wrap">
        <div className="sp-splash-ring" />
        <div className="sp-splash-ring-2" />
        <img src="/icons/logo-simpeg.png" alt="SIMPEG" className="sp-splash-logo" />
      </div>
      <div className="sp-splash-title">SIMPEG</div>
      <div className="sp-splash-sub">Sistem Informasi Kepegawaian &amp; Presensi</div>
      <div className="sp-splash-bar" aria-hidden="true" />
    </div>
  )
}
