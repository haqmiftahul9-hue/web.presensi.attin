import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router-dom'
const server = await createServer({ configFile:false, root:process.cwd(), logLevel:'silent', server:{middlewareMode:true}, appType:'custom' })
const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const { SimPresProvider } = store
const Page = (await server.ssrLoadModule('/src/pages/PengajuanIzinCutiPage.jsx')).default
const html = renderToString(h(MemoryRouter, {initialEntries:['/pengajuan-izin-dan-cuti']}, h(SimPresProvider, null, h(Page))))
console.log('len', html.length)
await server.close()