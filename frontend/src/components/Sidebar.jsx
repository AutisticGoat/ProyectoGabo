import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ links, brand = 'Hábitos', brandIcon = '◇' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon" aria-hidden="true">{brandIcon}</span>
        <span className="brand-text">{brand}</span>
      </div>

      <nav className="sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {/* Enlace al panel admin solo si nivel ≤ 2 */}
        {user?.nivel <= 2 && (
          <NavLink to="/admin" className="nav-link nav-link-admin">
            ⚙ Panel de administración
          </NavLink>
        )}
        {/* Enlace de vuelta al dashboard si estamos en admin */}
        {brand === 'Admin' && (
          <NavLink to="/dashboard" className="nav-link nav-link-dashboard">
            ⌂ Ir al dashboard
          </NavLink>
        )}
        <button onClick={handleLogout} className="nav-link nav-link-danger" style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
