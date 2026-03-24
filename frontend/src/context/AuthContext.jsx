import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/apiFetch'

// ── Contexto ──────────────────────────────────────────────
const AuthContext = createContext(null)

// ── Hook de acceso rápido ─────────────────────────────────
export function useAuth() {
  return useContext(AuthContext)
}

// ── Provider ──────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // { id, nombre, correo, rol, nivel }
  const [loading, setLoading] = useState(true)   // true mientras verifica sesión inicial

  // Verifica si hay sesión activa al cargar la app
  useEffect(() => {
    apiFetch('/auth_info.php')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          // Sesión activa — cargar datos completos del usuario
          return apiFetch('/usuario.php')
            .then(r => r.json())
            .then(u => {
              if (u.ok) {
                setUser({
                  id:     u.usuario.id_usuario,
                  nombre: u.usuario.nombre,
                  correo: u.usuario.correo,
                  rol:    data.nombre_rol,
                  nivel:  data.nivel_rol,
                })
              }
            })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Login ────────────────────────────────────────────────
  // Envía credenciales al backend y actualiza el contexto
  const login = useCallback(async (correo, password) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const form = new FormData()
    form.append('correo',   correo)
    form.append('password', password)
    form.append('timezone', timezone)

    const res  = await fetch('/api/login.php', { method: 'POST', body: form, credentials: 'include' })
    const data = await res.json()

    if (!data.ok) throw new Error(data.error || 'Credenciales incorrectas')

    setUser({
      id:     null,      // se cargará en la próxima llamada a /usuario.php
      nombre: '',
      correo,
      rol:    data.rol,
      nivel:  data.nivel,
      token:  data.token, // JWT para clientes API
    })

    return data // contiene redirect, rol, nivel
  }, [])

  // ── Logout ───────────────────────────────────────────────
  const logout = useCallback(async () => {
    await fetch('/api/logout.php', { credentials: 'include' }).catch(() => {})
    setUser(null)
  }, [])

  // ── Actualizar datos del usuario (tras editar perfil) ────
  const refreshUser = useCallback(async () => {
    const [infoRes, userRes] = await Promise.all([
      apiFetch('/auth_info.php').then(r => r.json()),
      apiFetch('/usuario.php').then(r => r.json()),
    ])
    if (infoRes.ok && userRes.ok) {
      setUser({
        id:     userRes.usuario.id_usuario,
        nombre: userRes.usuario.nombre,
        correo: userRes.usuario.correo,
        rol:    infoRes.nombre_rol,
        nivel:  infoRes.nivel_rol,
      })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
