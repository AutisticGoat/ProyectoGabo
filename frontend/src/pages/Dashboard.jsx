import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar        from '../components/Sidebar'
import { useAuth }   from '../context/AuthContext'
import Usuario        from '../views/Usuario'
import Rutinas        from '../views/Rutinas'
import Avisos         from '../views/Avisos'
import Historial      from '../views/Historial'
import Configuraciones from '../views/Configuraciones'

const LINKS = [
  { to: '/dashboard/usuario',        label: 'Mi cuenta'     },
  { to: '/dashboard/rutinas',        label: 'Rutinas'       },
  { to: '/dashboard/avisos',         label: 'Avisos'        },
  { to: '/dashboard/historial',      label: 'Historial'     },
  { to: '/dashboard/configuraciones',label: 'Configuración' },
]

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-inner">
          <h1 className="page-title">Panel</h1>
          <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>
            {user?.nombre} · <span style={{ textTransform: 'capitalize' }}>{user?.rol}</span>
          </span>
        </div>
      </header>

      <Sidebar links={LINKS} brand="Hábitos" brandIcon="◇" />

      <main className="dashboard-main">
        <div className="main-inner">
          <Routes>
            <Route path="usuario"         element={<Usuario />} />
            <Route path="rutinas"         element={<Rutinas />} />
            <Route path="avisos"          element={<Avisos />} />
            <Route path="historial"       element={<Historial />} />
            <Route path="configuraciones" element={<Configuraciones />} />
            <Route path="*" element={<Navigate to="usuario" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
