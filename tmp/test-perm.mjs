import { createServer } from 'vite'
const server = await createServer({ configFile:false, root:process.cwd(), logLevel:'silent', server:{middlewareMode:true}, appType:'custom' })
const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const { initialState, hasPermission } = store
const u = initialState.adminUsers.find(x=>x.role==='Superadmin')
const st = {...initialState, currentUser: u}
console.log('superadmin edit izin:', hasPermission(st, 'Superadmin', 'pengajuanIzinCuti', 'edit'))
console.log('kepsek edit izin:', hasPermission({...initialState, currentUser:{role:'Kepala Sekolah',unitId:'sd'}}, 'Kepala Sekolah', 'pengajuanIzinCuti', 'edit'))
await server.close()