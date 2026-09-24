function ConfirmDialog({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'default',
}) {
  if (!show) return null

  const iconMap = {
    danger: { icon: 'warning', bg: 'bg-rose-100', iconColor: 'text-rose-600' },
    warning: { icon: 'warning', bg: 'bg-amber-100', iconColor: 'text-amber-600' },
    default: { icon: 'help_center', bg: 'bg-slate-100', iconColor: 'text-slate-600' },
  }
  const cfg = iconMap[variant] || iconMap.default

  const confirmClass =
    variant === 'danger'
      ? 'px-space-md py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-on-primary font-body-md-medium text-body-md-medium shadow-sm flex items-center gap-1.5 transition-all cursor-pointer'
      : variant === 'warning'
        ? 'px-space-md py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-on-primary font-body-md-medium text-body-md-medium shadow-sm flex items-center gap-1.5 transition-all cursor-pointer'
        : 'px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium shadow-sm flex items-center gap-1.5 transition-all cursor-pointer'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-space-lg py-space-md bg-surface-container-lowest flex items-start gap-4">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.iconColor}`}>
            <span className="material-symbols-outlined text-[22px]">{cfg.icon}</span>
          </div>
          <div className="flex flex-col">
            <h3 className="font-headline-sm text-headline-sm text-primary leading-tight">{title}</h3>
            {message && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>
        <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-end gap-space-xs">
          <button
            onClick={onClose}
            className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-body-md-medium text-body-md-medium transition-colors cursor-pointer"
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
              {variant === 'danger' ? 'delete' : 'check'}
            </span>
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
