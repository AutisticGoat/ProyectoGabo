import { Routes, Route, Navigate } from 'react-router-dom'
import Login           from './pages/Login'
import Register        from './pages/Register'
import RecoverPassword from './pages/RecoverPassword'
import Dashboard       from './pages/Dashboard'
import Admin           from './pages/Admin'
import ProtectedRoute  from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/recover"  element={<RecoverPassword />} />

      {/* Dashboard — cualquier usuario autenticado */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Panel admin — solo nivel ≤ 2 (admin / superadmin) */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredLevel={2}>
            <Admin />
          </ProtectedRoute>
        }
      />

      {/* Ruta raíz → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
