function ImportModal({ show, onClose }) {
  return (
    <div className={`fixed inset-0 z-50 bg-[#0b1f3d]/50 backdrop-blur-sm p-4 ${show ? 'flex' : 'hidden'} items-center justify-center transition-all`}>
      <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-[560px] overflow-hidden flex flex-col">
        <div className="p-space-lg flex items-start justify-between bg-surface-container-low">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-[24px]">upload_file</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Import Data Pegawai</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Unggah lembar kerja Excel (.xlsx) untuk pembaruan data massal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-space-lg flex flex-col gap-space-md">
          <div className="w-full rounded-xl bg-surface-container-low p-space-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container transition-colors group">
            <div className="w-14 h-14 rounded-full bg-surface-container group-hover:bg-secondary-fixed group-hover:text-secondary text-on-surface-variant flex items-center justify-center mb-space-sm transition-colors">
              <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
            </div>
            <p className="font-body-md-medium text-body-md-medium text-on-surface">
              Tarik file Excel ke sini atau <span className="text-secondary hover:underline font-body-md-medium">klik untuk memilih file</span>
            </p>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              Format file yang didukung: .XLSX, .XLS, atau .CSV (Maks. 10 MB)
            </span>
            <input accept=".xlsx, .xls, .csv" className="hidden" type="file" />
          </div>
          <div className="p-space-md rounded-lg bg-blue-50 text-on-surface flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-secondary font-headline-sm">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span className="text-body-sm-medium">Ketentuan Kolom Wajib:</span>
            </div>
            <ul className="font-body-sm text-on-surface-variant list-disc pl-5 space-y-1">
              <li>Kolom <strong className="text-on-surface">NIY (Nomor Induk Yayasan)</strong> harus unik dan tidak boleh kosong.</li>
              <li>Nama lengkap beserta gelar akademik dicantumkan pada kolom Nama.</li>
              <li>Unit kerja harus sesuai dengan penamaan unit terdaftar di sistem.</li>
            </ul>
            <div className="mt-1 pt-2 flex items-center justify-between text-body-sm">
              <a className="font-body-sm-medium text-body-sm-medium text-secondary hover:underline flex items-center gap-1" href="#">
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Belum punya format? Unduh Template Resmi di sini</span>
              </a>
            </div>
          </div>
        </div>
        <div className="p-space-md bg-surface-container-low flex items-center justify-end gap-space-xs">
          <button
            onClick={onClose}
            className="h-10 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium transition-colors cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            className="h-10 px-space-lg rounded-lg bg-primary-container hover:bg-[#132c54] text-on-primary font-body-md-medium flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            <span>Upload & Proses Data</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportModal