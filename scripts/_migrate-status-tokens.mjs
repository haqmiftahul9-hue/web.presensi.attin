import fs from 'node:fs'
import path from 'node:path'

// Mapping kelas Tailwind hardcode -> token status semantik.
// Urutan penting: yang paling spesifik dulu.
const RULES = [
  // --- success (hijau) ---
  ['bg-emerald-50', 'bg-status-success-soft'],
  ['bg-emerald-100', 'bg-status-success-soft'],
  ['bg-emerald-200', 'bg-status-success-soft'],
  ['bg-emerald-300', 'bg-status-success-soft'],
  ['bg-emerald-400', 'bg-status-success'],
  ['bg-emerald-500', 'bg-status-success'],
  ['bg-emerald-600', 'bg-status-success'],
  ['bg-emerald-700', 'bg-status-success'],
  ['text-emerald-300', 'text-status-success-bright'],
  ['text-emerald-400', 'text-status-success-bright'],
  ['text-emerald-500', 'text-status-success-text'],
  ['text-emerald-600', 'text-status-success-text'],
  ['text-emerald-700', 'text-status-success-text'],
  ['text-emerald-800', 'text-status-success-bright'],
  ['text-emerald-900', 'text-status-success-bright'],
  ['text-emerald-950', 'text-status-success-bright'],
  ['border-emerald-100', 'border-status-success-border'],
  ['border-emerald-200', 'border-status-success-border'],
  ['border-emerald-300', 'border-status-success-border'],
  ['border-emerald-400', 'border-status-success-border'],
  ['border-emerald-500', 'border-status-success'],
  ['ring-emerald-300', 'ring-status-success-border'],
  ['ring-emerald-400', 'ring-status-success-border'],
  ['ring-emerald-500', 'ring-status-success'],
  ['from-emerald-600', 'from-status-success'],
  ['via-emerald-400', 'via-status-success'],

  // --- warning (amber) ---
  ['bg-amber-50', 'bg-status-warning-soft'],
  ['bg-amber-100', 'bg-status-warning-soft'],
  ['bg-amber-200', 'bg-status-warning-soft'],
  ['bg-amber-300', 'bg-status-warning-soft'],
  ['bg-amber-400', 'bg-status-warning'],
  ['bg-amber-500', 'bg-status-warning'],
  ['bg-amber-600', 'bg-status-warning'],
  ['text-amber-300', 'text-status-warning-bright'],
  ['text-amber-400', 'text-status-warning-bright'],
  ['text-amber-500', 'text-status-warning-text'],
  ['text-amber-600', 'text-status-warning-text'],
  ['text-amber-700', 'text-status-warning-text'],
  ['text-amber-800', 'text-status-warning-bright'],
  ['text-amber-900', 'text-status-warning-bright'],
  ['text-amber-950', 'text-status-warning-bright'],
  ['border-amber-200', 'border-status-warning-border'],
  ['border-amber-300', 'border-status-warning-border'],
  ['border-amber-400', 'border-status-warning-border'],
  ['border-amber-500', 'border-status-warning'],
  ['ring-amber-300', 'ring-status-warning-border'],
  ['ring-amber-400', 'ring-status-warning-border'],
  ['shadow-amber-400', 'shadow-status-warning'],
  ['shadow-amber-500', 'shadow-status-warning'],

  // --- danger (rose) ---
  ['bg-rose-50', 'bg-status-danger-soft'],
  ['bg-rose-100', 'bg-status-danger-soft'],
  ['bg-rose-200', 'bg-status-danger-soft'],
  ['bg-rose-300', 'bg-status-danger-soft'],
  ['bg-rose-400', 'bg-status-danger'],
  ['bg-rose-500', 'bg-status-danger'],
  ['bg-rose-600', 'bg-status-danger'],
  ['bg-rose-700', 'bg-status-danger'],
  ['text-rose-300', 'text-status-danger-bright'],
  ['text-rose-400', 'text-status-danger-bright'],
  ['text-rose-500', 'text-status-danger-text'],
  ['text-rose-600', 'text-status-danger-text'],
  ['text-rose-700', 'text-status-danger-text'],
  ['text-rose-800', 'text-status-danger-bright'],
  ['text-rose-900', 'text-status-danger-bright'],
  ['border-rose-200', 'border-status-danger-border'],
  ['border-rose-300', 'border-status-danger-border'],
  ['border-rose-400', 'border-status-danger-border'],
  ['border-rose-500', 'border-status-danger'],
  ['ring-rose-400', 'ring-status-danger'],
  ['ring-rose-500', 'ring-status-danger'],
  ['shadow-rose-400', 'shadow-status-danger'],
  ['shadow-rose-500', 'shadow-status-danger'],
]

// Varian dengan modifier opacity, mis. `bg-emerald-500/10`.
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const dirs = process.argv.slice(2)
let total = 0

for (const dir of dirs) {
  for (const file of fs.readdirSync(dir)) {
    if (!/\.jsx?$/.test(file)) continue
    const full = path.join(dir, file)
    let src = fs.readFileSync(full, 'utf8')
    let changed = false
    for (const [from, to] of RULES) {
      const re = new RegExp(`(?<![\\w-])${escapeRe(from)}(?![\\w-])`, 'g')
      if (re.test(src)) {
        src = src.replace(re, to)
        changed = true
      }
    }
    if (changed) {
      fs.writeFileSync(full, src)
      total++
      console.log('updated', full)
    }
  }
}
console.log(`\n${total} file(s) updated`)
