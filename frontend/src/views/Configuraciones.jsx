import { useState, useEffect } from 'react'
import { apiFetch } from '../api/apiFetch'

function applyTema(tema) {
  document.documentElement.classList.toggle('tema-oscuro', tema === 'oscuro')
  document.body.classList.toggle('tema-oscuro', tema === 'oscuro')
}

export default function Configuraciones() {
  const [tema, setTema]   = useState('claro')
  const [msg,  setMsg]    = useState('')

  useEffect(() => {
    apiFetch('/configuracion.php').then(r => r.json()).then(d => {
      if (d.ok) { setTema(d.configuracion.tema || 'claro') }
    }).catch(() => {})
  }, [])

  const handleGuardar = async () => {
    await apiFetch('/configuracion.php', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema }),
    })
    applyTema(tema)
    setMsg('✓ Configuración guardada.')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <section className="card">
      <h2>Configuración</h2>
      <label>
        Tema de la aplicación
        <select value={tema} onChange={e => setTema(e.target.value)}>
          <option value="claro">Claro</option>
          <option value="oscuro">Oscuro</option>
        </select>
      </label>
      <button onClick={handleGuardar}>Guardar</button>
      {msg && <p style={{ color: '#0d9488', fontSize: '.8rem', marginTop: '.5rem' }}>{msg}</p>}
    </section>
  )
}
