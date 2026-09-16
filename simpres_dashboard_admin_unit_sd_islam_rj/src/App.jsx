import SidebarNav from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import Dashboard from './components/Dashboard.jsx'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="pl-[260px]">
        <Header />
        <main className="w-full pt-16 bg-background min-h-screen">
          <Dashboard />
        </main>
      </div>
    </div>
  )
}

export default App