import fs from 'fs'
import path from 'path'

function findIcons(dir) {
  let icons = new Set()
  if (!fs.existsSync(dir)) return icons
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const f of files) {
    const full = path.join(dir, f.name)
    if (f.isDirectory()) {
      findIcons(full).forEach(i => icons.add(i))
    } else if (f.name.endsWith('.jsx') || f.name.endsWith('.js')) {
      const src = fs.readFileSync(full, 'utf8')
      const r1 = /name=["']([a-zA-Z0-9_-]+)["']/g
      const r2 = /ikon:\s*["']([a-zA-Z0-9_-]+)["']/g
      const r3 = /icon:\s*["']([a-zA-Z0-9_-]+)["']/g
      let m
      while ((m = r1.exec(src)) !== null) icons.add(m[1])
      while ((m = r2.exec(src)) !== null) icons.add(m[1])
      while ((m = r3.exec(src)) !== null) icons.add(m[1])
    }
  }
  return icons
}

const mobileIcons = findIcons('src/pages/mobile')
findIcons('src/components/mobile').forEach(i => mobileIcons.add(i))

const iconFile = fs.readFileSync('src/components/Icon.jsx', 'utf8')
const missing = []
for (const icon of mobileIcons) {
  const pattern = new RegExp(`\\b${icon}:`)
  if (!pattern.test(iconFile)) {
    missing.push(icon)
  }
}

console.log('Total mobile icons detected:', mobileIcons.size)
console.log('Missing icons:', missing)
