import { useEffect } from 'react'
import { createPortal } from 'react-dom'

function ConfirmDialog({
  show = true,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'default',
  confirmIcon,
}) {
  useEffect(() => {
    if (!show) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [show, onClose])

  if (!show) return null

  const iconMap = {
    danger: { icon: 'warning', bg: 'bg-destructive/10 text-destructive border-destructive/20' },
    warning: { icon: 'warning', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    default: { icon: 'help_center', bg: 'bg-primary/10 text-primary border-primary/20' },
  }
  const cfg = iconMap[variant] || iconMap.default

  const confirmClass =
    variant === 'danger'
      ? 'h-9 px-4 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all duration-200 active:scale-[0.98] cursor-pointer'
      : variant === 'warning'
        ? 'h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all duration-200 active:scale-[0.98] cursor-pointer'
        : 'h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all duration-200 active:scale-[0.98] cursor-pointer'

  const dialogContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-sp-fade"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md bg-card text-card-foreground border border-border shadow-2xl rounded-2xl overflow-hidden animate-sp-rise flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 bg-card flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg}`}>
            <span className="material-symbols-outlined text-[22px]">{cfg.icon}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground leading-snug">{title}</h3>
            {message && (
              <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {message}
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm?.()
              onClose?.()
            }}
            className={confirmClass}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {confirmIcon || (variant === 'danger' ? 'logout' : 'check')}
            </span>
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )

  // Gunakan createPortal ke document.body agar tidak terperangkap di dalam
  // kontainer bertransformasi seperti sidebar aside (translate-x-0).
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(dialogContent, document.body)
  }

  return dialogContent
}

export default ConfirmDialog
