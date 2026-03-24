import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar           from '../components/Sidebar'
import AdminEstadisticas from '../views/AdminEstadisticas'
import AdminUsuarios     from '../views/AdminUsuarios'

const LINKS = [
  { to: '/admin/estadisticas', label: 'Estadísticas' },
  { to: '/admin/usuarios',     label: 'Usuarios'     },
]

export default function Admin() {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-inner">
          <h1 className="page-title">Panel Admin</h1>
        </div>
      </header>

      <Sidebar links={LINKS} brand="Admin" brandIcon="◆" />

      <main className="dashboard-main">
        <div className="main-inner main-inner--wide">
          <Routes>
            <Route path="estadisticas" element={<AdminEstadisticas />} />
            <Route path="usuarios"     element={<AdminUsuarios />} />
            <Route path="*" element={<Navigate to="estadisticas" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
