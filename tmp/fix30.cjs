const fs = require('fs');
const p = 'src/pages/RekapLaporanPage.jsx';
let c = fs.readFileSync(p, 'utf8');

const old = `                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-5 border-t border-border bg-muted/30 flex gap-2.5 justify-end">`;

const neu = `                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Ukuran Kertas</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={\`flex flex-col items-center justify-center gap-1 cursor-pointer p-2.5 rounded-xl border text-center transition-all \${reportSettings.paperSize === 'a4' ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs' : 'border-border bg-muted/30 hover:bg-muted text-foreground'}\`}>
                      <input type="radio" name="paperSize" value="a4" checked={reportSettings.paperSize === 'a4'} onChange={(e) => setReportSettings(prev => ({...prev, paperSize: e.target.value}))} className="sr-only" />
                      <span className="material-symbols-outlined text-[20px] text-primary">description</span>
                      <span className="text-[11px] font-medium leading-tight">A4</span>
                    </label>
                    <label className={\`flex flex-col items-center justify-center gap-1 cursor-pointer p-2.5 rounded-xl border text-center transition-all \${reportSettings.paperSize === 'f4' ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs' : 'border-border bg-muted/30 hover:bg-muted text-foreground'}\`}>
                      <input type="radio" name="paperSize" value="f4" checked={reportSettings.paperSize === 'f4'} onChange={(e) => setReportSettings(prev => ({...prev, paperSize: e.target.value}))} className="sr-only" />
                      <span className="material-symbols-outlined text-[20px] text-primary">description</span>
                      <span className="text-[11px] font-medium leading-tight">F4 (Folio)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-5 border-t border-border bg-muted/30 flex gap-2.5 justify-end">`;

if (!c.includes(old)) { console.log('old not found'); process.exit(1); }
c = c.replace(old, neu);
fs.writeFileSync(p, c);
console.log('done');
