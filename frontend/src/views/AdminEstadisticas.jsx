import { useState, useEffect } from 'react'
import { apiFetch } from '../api/apiFetch'

export default function AdminEstadisticas() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    apiFetch('/admin_stats.php').then(r => r.json()).then(d => { if (d.ok) setStats(d) }).catch(() => {})
  }, [])

  const cards = [
    { id: 'total_usuarios',    label: 'Usuarios totales' },
    { id: 'usuarios_activos',  label: 'Usuarios activos' },
    { id: 'total_rutinas',     label: 'Rutinas creadas'  },
    { id: 'total_habitos',     label: 'Hábitos creados'  },
  ]

  return (
    <section className="card">
      <h2>Estadísticas generales</h2>
      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.id} className="stat-card">
            <div className="stat-value">{stats ? stats[c.id] ?? '—' : '…'}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
