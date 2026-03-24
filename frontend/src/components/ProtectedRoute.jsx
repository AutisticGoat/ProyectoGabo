import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── ProtectedRoute ────────────────────────────────────────
// Props:
//   children      — componente a renderizar si pasa el guard
//   requiredLevel — nivel máximo de rol permitido (default: 4 = cualquiera)
//
// Comportamiento:
//   - Si la sesión aún se está verificando → muestra spinner
//   - Si no hay usuario → redirige a /login
//   - Si el nivel del usuario es mayor al requerido → redirige a /dashboard
//   - Si pasa todo → renderiza children
export default function ProtectedRoute({ children, requiredLevel = 4 }) {
  const { user, loading } = useAuth()

  // Verificando sesión inicial
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Verificando sesión…</span>
      </div>
    )
  }

  // Sin sesión activa → login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Nivel insuficiente → dashboard (no 404, para no revelar que existe la ruta)
  if (user.nivel > requiredLevel) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
