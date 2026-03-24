// Base URL — el proxy de Vite redirige /api → /ProyectoGabo/php
const BASE = '/api'

// ── apiFetch ──────────────────────────────────────────────
// Wrapper sobre fetch que:
//   - Añade credentials: 'include' siempre (mantiene la cookie de sesión)
//   - Lanza error especial en 401 (no autenticado)
//   - Lanza error especial en 403 (sin permisos)
export async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    credentials: 'include',
    ...options,
  })

  if (res.status === 401) {
    // Sesión expirada o inválida — redirigir al login
    window.location.href = '/login'
    throw new Error('No autorizado')
  }

  if (res.status === 403) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Acceso prohibido')
  }

  return res
}

// ── Helpers de fecha (igual que en script.js original) ────
export function toUTCDateTimeStr(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
         `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
}

export function parseDbDate(str) {
  if (!str) return null
  return new Date(str.replace(' ', 'T') + 'Z')
}
